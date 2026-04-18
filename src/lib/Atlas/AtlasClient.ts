import { Client } from "cassandra-driver";
import { AtlasDB } from "../Configs/Config.js";
import type { ConcatenatedQuery, CQLObjType, CQLOpType } from "./typings/CQLRequests.js";
import {Logger, LogLevel} from "../../../../Logging/dist/Logger.js"

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
            keyspace: "ATLAS"
        })
    }

     
}

class AtlasConnectionPool {
    // have a map of different connections
    // when a function wants to make a request it can either keep using the same connection or:
    // if it has returned the connection to the pool
    // the following will happen
    /*
        The function will make a request to the pool asking for a connection
        The pool can either respond with any available connection
        or it can have a specific connection requested
        the pool will then check if this connection is in use, and if it is then it will reject the request
        and return an error code

        if the connection is available then the pool will pass  the connection to the requester and
        flag the connection as "IN USE"
    */
}

class Atlas {
    constructor() {

    }


}