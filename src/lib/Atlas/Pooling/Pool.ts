import { Logger, LogLevel } from "../../../../../Logging/dist/Logger.js";
import { formatError } from "../../ErrorFormatter.js";
import { PoolError } from "./PoolErrors.js";

export enum PoolItemState {
    PREPARE, // Resource does not yet have a callback
    STANDBY, // Resource assigned a callback, not in use
    ACTIVE,  // Resource actively in use
	SHUTDOWN // Resource had a fatal error and has been shut down to be restarted
}

export interface PoolStates {
    key: string
    state: PoolItemState
}
export type PoolItemPair = [string, PoolItem];

// contains the state and callback of a item used in the pool
class PoolItem {
	private _state: number;
	constructor(
		private _callback?: Object
	) {
		this._state = this._callback? PoolItemState.STANDBY : PoolItemState.PREPARE;
	}
	// allow for defining no callback and then add the callback later on
	public initCallback(callback: Object): void {
		if (this._callback) {
			Logger.sendLog(LogLevel.Error, ["Pool","PoolItem","initCallback()"], "Refusing to initialize callback value as a callback is already present");
			return;
		}

		this._callback = callback;
		this.setStandby();
	}

	public get state(): PoolItemState {
		return this._state;
	}

	public setActive() {
		this._state = PoolItemState.ACTIVE;
	}

	public setStandby() {
		this._state = PoolItemState.STANDBY;
	}

	public get callback(): Object {
		// @ts-ignore - This will ALWAYS be present as the pool will never dispatch a resource without a callback
		return this._callback as Object; // still add a type conversion though 
	}
}

class Pool {
	private resources: Map<string, PoolItem> = new Map<string, PoolItem>;
	constructor(private readonly name?: string) {
		for (let i: number = 0; i < 10; i++) {
			this.resources.set("POOL"+i.toString(), new PoolItem());
			Logger.sendLog(LogLevel.Verbose, ["Pool","constructor"], "Created Pooling Resource POOL"+i.toString());
		}
	}

	// --- PROPERTY ACCESSORS --- 

	public get poolSize(): number {
		return this.resources.size;
	}

	public get poolStates(): PoolStates[] {
		return this.resources.entries().map((kv_pair,v) => {
			return {
				key: kv_pair[0],
				state: kv_pair[1].state
			}
		}).toArray();
	}

	// --- Methods ---

	// sets every resource within the pool to the callback, either a variable or a function
	public initResources(callback: Object): void {
		this.resources.forEach((item) => {
			item.initCallback(callback);
		})
	}

	public getAnyStandbyResource(): PoolItemPair | undefined {
		return this.resources.entries().find(([key, value]) => value.state === PoolItemState.STANDBY);
	}


	/**
	 * Unused function, might be implemeneted at a later date
	 * @param resourceId 
	 */
	public setResourceInUse(resourceId: string) {

	}

	/**
	 * Requests a resource on standby from the pool and returns its key and value in the pool
	 * 
	 * This function requires a check after calling to see if no pooling item was returned, as you cannot return nothing to the pool
	 * @returns `PoolItemPair` | `undefined`
	 */
	public requestForResource(): PoolItemPair | undefined {
		const selectedResource = this.getAnyStandbyResource();
		if (!selectedResource) {
			Logger.sendLog(LogLevel.Warning, ["Pool", "requestForResource()"], formatError(PoolError.POOL_NO_RESOURCES_ON_STANDBY,this.name));
			return;
		}
		Logger.sendLog(LogLevel.Verbose, ["Pool", "requestForResource()"], "Dispatched resource "+selectedResource[0])
		selectedResource[1].setActive();
		return selectedResource;
	}

	public returnResource(resource: PoolItemPair) {
		resource[1].setStandby();
		Logger.sendLog(LogLevel.Verbose, ["Pool", "returnResource()"], resource[0]+" Was returned back to "+this.name)
	}
}

const p = new Pool("TestPool");
p.initResources([()=>{console.log("Called a pools resource!: Hello! I am a pool resource")}, {
	name:"Pooling resource!"
}])
Logger.sendLog(LogLevel.Verbose, ["testpool > Resource States Before Request"], p.poolStates);
Logger.sendLog(LogLevel.Verbose, ["testpool > Pool Size"], p.poolSize);
Logger.sendLog(LogLevel.Verbose, ["testpool"], "Requesting for a resource on standby");
const b = p.requestForResource()
if (b) {
	Logger.sendLog(LogLevel.Verbose, ["testpool > Resource States After Request"], p.poolStates);
	Logger.sendLog(LogLevel.Verbose, ["testpool > Requested Resource"], b);
	Logger.sendLog(LogLevel.Verbose, ["testpool > Requested Resource Value 2"], (b[1].callback as any[])[1]);
	(b[1].callback as any[])[0]();
	p.returnResource(b)
};


// class PoolManager {
// 	constructor(pool: Pool) {

// 	}
// }

export function a() {

}