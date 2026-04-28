import { Client, types } from "cassandra-driver";
import { AtlasDB } from "./Configs/Config.js";
import type { ConcatenatedQuery, CQLObjType, CQLOpType } from "./modules/cql/CQLRequests.js";
import { Logger, LogLevel } from "../../../Logging/dist/Logger.js"
import { DynamicPool, FixedPool, PoolItem, PoolItemState, type PoolItemPair } from "./modules/pooling/Pool.js";
import EventEmitter from "events";
import { PoolError } from "./modules/pooling/PoolErrors.js";
import { StateEvents, StateListener, StatesObject } from "./modules/StateListener.js";
import type { Message } from "./modules/Types.js";
import { UserTableManager } from "./modules/AtlasModules.js";

type Nullable<T> = T | null;
type AtlasClientResponse = types.ResultSet | PoolError;
class CQLRequest {
  constructor(
    protected OpType: CQLOpType,
    protected ObjType: CQLObjType
  ) {

  }

  /**
   * Concatenates an array of CQL request objects into one string, inserts spaces in between items
   * @param args A list of CQLRequests or `typeof` CQLRequest to concatenate
   * @returns ConcatenatedQuery
   */
  public concat(...args: string[]): ConcatenatedQuery {
    return args.join(" ")
  }
}

class AtlasConnection {
  public readonly cluster: Client;
  constructor() {
    this.cluster = new Client({
      contactPoints: AtlasDB.Connect.Locations,
      localDataCenter: "datacenter1",
      credentials: AtlasDB.Auth,
      keyspace: "atlas" // keyspaces are always lowercase
    })
    this.cluster.connect().then(() => {
      this.cluster.emit("ready");
    }); // idk if there are any sideeffects


  }

  public onceStarted(callback: CallableFunction, ...args: any[]): void {
    this.cluster.once("ready", () => {
      callback(args);
    });
  }
}


export namespace Pooling {
  export const PoolEvents = {
    PoolInitializing: "POOL_INITIALIZING",
    PoolReady: "POOL_READY",
    PoolAcceptRequests: "POOL_READY_FOR_REQUESTS",
    PoolError: "POOL_ERROR"
  }

  export enum PoolState {
    INITIALIZING,
    READY,
    INACTIVE,
    FAILED
  }

  export class AtlasConnectionPool extends FixedPool {
    public readonly events: EventEmitter = new EventEmitter();
    private _state: PoolState = PoolState.INITIALIZING;
    
    constructor(poolSize: number) {
      Logger.sendLog(LogLevel.Verbose, ["AtlasClient", "ConnectionPool"], "Initializing ATLAS Connection Pool | Size:", poolSize);
      super("ATLAS_CONNECTION_POOL", poolSize);

      // listen fopr the state listener ready signal
      this.states.on(StateEvents.StateTargetReached, (states) => {
        Logger.sendLog(LogLevel.Info, ["AtlasClient", "ConnectionPool"], "ATLAS Connection Pool is ready, requests can now be made");
        this._state = PoolState.READY;
      })

      // populate the pool with AtlasConnection, and then for every resource add the oncestarted hook
      this.initResources(new AtlasConnection()).forEach((item, key) => {
        (item.callback as AtlasConnection).onceStarted(() => { // run this code once when a resource starts
          Logger.sendLog(LogLevel.Verbose, ["AtlasClient", "ConnectionPool"], key, "initialized and connected to database");
          this.states.changeState(key, item.state);
        });
      });

    }

    public get state(): PoolState {
      return this._state;
    }

    /**
     * Gets a desired resource from the pool by its key. If the resource is not free then any available resource is returned
     */
    public getDesiredResource(key: string): PoolItemPair | undefined{
      const request = this.resources.get(key);
      if (request?.state !== PoolItemState.STANDBY) {
        return this.requestForResource();
      }
      return undefined;
    }
  }
}

//?! ENSURE THIS GETS UPDATED AS THE DATABASE PROGRESSES IN DEVELOPMENT
export class RequestHelper {
  private parentConnections: Pooling.AtlasConnectionPool;
  constructor(
    private readonly parent: AtlasClient
  ) {
    this.parentConnections = parent.pool;
  }
  public toConnection(connection: PoolItemPair): AtlasConnection {
    return (connection.resource.callback as AtlasConnection);
  }
  public getTable(from: string, where?: string): Promise<types.ResultSet> | undefined {
    const _conn = this.parentConnections.requestForResource();
    if (!_conn) return;
    const conn = this.toConnection(_conn);

    const result = conn.cluster.execute("SELECT * FROM "+from+";");
    this.parentConnections.returnResource(_conn);

    return result;
  }

  public newRecord(where: string, keys: string[], data: Object): Promise<types.ResultSet> | undefined {
    const _conn = this.parentConnections.requestForResource();
    if (!_conn) return;
    const conn = this.toConnection(_conn);

    const result = conn.cluster.execute(`INSERT INTO ${where} (${keys.join(", ")}) VALUES (${Object.values(data).join(", ")});`);
    this.parentConnections.returnResource(_conn);

    return result;
  }

  public _newRecord(where: string, keys: string[], data: Object): Promise<types.ResultSet> | undefined {
    const _conn = this.parentConnections.requestForResource();
    if (!_conn) return;
    const conn = this.toConnection(_conn);

    const result = conn.cluster.execute(`INSERT INTO ${where} (${keys.join(", ")}) VALUES (${data});`);
    this.parentConnections.returnResource(_conn);

    return result;
  }
}
interface BaseUser {
  user_id: string
  username: string // HAS TO BE UNIQUE IF WE ARE MAKING POMELO
  discriminator?: number // HAS TO BE 4 NUMBERS LONG | 1111 | 1683 | 6021
  displayName: string
  avatar?: string // URL
  createdAt?: number
}
export class AtlasClient {
  private connections: Pooling.AtlasConnectionPool = new Pooling.AtlasConnectionPool(10);
  private requests: RequestHelper = new RequestHelper(this);
  public readonly users: UserTableManager = new UserTableManager(this);
  private states = {
    connections: new StateListener(Pooling.PoolState.INITIALIZING),
  };
  constructor() {
    this.states.connections.setTargetState(Pooling.PoolState.READY);
    Logger.sendLog(LogLevel.Verbose, ["AtlasClient"], "Initializing ATLAS Client");
  }

  /**
   * Returns the state the connection pool is currently in, refer to {@link Pooling.PoolState}
   */
  public get isPoolReady(): Pooling.PoolState {
    return this.connections.state;
  }

  public toConnection(connection: PoolItemPair): AtlasConnection {
    return (connection.resource.callback as AtlasConnection);
  }
  /**
   * Returns the connection pool
   */
  public get pool(): Pooling.AtlasConnectionPool {
    return this.connections;
  }

  public onPoolReady(callback: (...args: any[]) => void) {
    this.connections.states.on(StateEvents.StateTargetReached, callback);
  }

  public execute(request: string): Promise<types.ResultSet>;
  public execute(resource: PoolItemPair | PoolItem, request: string): Promise<types.ResultSet>;
  public async execute(...args:any[]): Promise<AtlasClientResponse> {
    if (args.length === 1) { // REQUEST ONLY
      // only has the request parameter
      const requestCluster = this.connections.requestForResource();

      // check if the response is undefined, if so then there are no standby resources and we should re-attempt the request with a promise
      if (!requestCluster) {
        Logger.sendLog(LogLevel.Warning, ["AtlasClient", "execute()", "requestOnly"], "ATLAS requested for a resource and got an undefined response. Cannot continue query execution.");
        return PoolError.POOL_NO_RESOURCES_ON_STANDBY;
      }
      
      const response = await (requestCluster.resource.callback as AtlasConnection).cluster.execute(args[0]);
      this.connections.returnResource(requestCluster);

      return response;

    } else if (args.length === 2) {
      let _resource: AtlasConnection;

      // filter depending on the type
      if (args[0] instanceof PoolItem) {
        _resource = args[0].callback as AtlasConnection; // if we have a PoolItem passed in, get the callback part of it
      } else {
        _resource = args[0].resource.callback as AtlasConnection; // i dont fucking know how to check if osmething is a type, only a class
      }

      return await _resource.cluster.execute(args[1]);
    } else {
      // sadly this WILL kill the process
      Logger.sendLog(LogLevel.Error, ["AtlasClient", "execute()"], "ATLAS was supplied too many arguments and no valid overload was found. ", args);
      throw new Error("ATLAS was passed too many arguments into execute(), please check ensure LogLevel encompasses ERROR for more info.");
    }
  }

  // --- TEST METHODS !! MUST REMOVE LATER ON
  public async getUsers() {
    this.requests.getTable("users")?.then((res) => Logger.sendLog(LogLevel.Info, ["AtlasClient", "getUsers()", "Result"], res))
  }

  public async addUser(userInfo: BaseUser) {
    userInfo.createdAt = Date.now();
    this.requests.newRecord("users", ["user_id", "username", "display_name", "created_at"], userInfo)?.then((res) => {
      Logger.sendLog(LogLevel.Info, ["AtlasClient", "addUser()", "Result"], res.columns);
    })
  }

  public async newMessage(message: Message) {
    console.log(message);

    this.requests._newRecord("messages", ["channel_id", "author_id", "content"], [message.channel_id, message.author_id, message.content, message.server_id])?.then((res) => {
      Logger.sendLog(LogLevel.Info, ["AtlasClient", "newMessage()", "Result"], res);
    })
  }
}
