import { Logger, LogLevel } from "../../../../../Logging/dist/Logger.js";
import { formatError } from "../../ErrorFormatter.js";
import { StatesObject } from "../StateListener.js";
import { PoolError } from "./PoolErrors.js";

export enum PoolItemState {
	PREPARE, // 0 - Resource does not yet have a callback
	STANDBY, // 1 - Resource assigned a callback, not in use
	ACTIVE,  // 2 - Resource actively in use
	SHUTDOWN // 3 - Resource had a fatal error and has been shutdown to prevent issues while the pool repairs it
}

export interface PoolStates {
	key: string
	state: PoolItemState
}
export interface PoolItemPair {
	key: string
	resource: PoolItem
}

// contains the state and callback of a item used in the pool
export class PoolItem {
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

	public setShutdown() { // flag the resource as shutdown, this means the pool will try and repair it if told to. 
		this._state = PoolItemState.SHUTDOWN;
	}

	public get callback(): Object {
		// @ts-ignore - This will ALWAYS be present as the pool will never dispatch a resource without a callback
		return this._callback as Object; // still add a type conversion though 
	}
}

// TODO: Self-Repairing -
export class Pool {
	protected resources: Map<string, PoolItem> = new Map<string, PoolItem>;
	constructor(
		protected readonly name: string,
		protected callback?: Object
	) {
		
	}

	// --- PROPERTY ACCESSORS --- 

	public get poolSize(): number {
		return this.resources.size;
	}

	public get poolStates(): PoolStates[] {
		
		return Array.from(this.resources.entries()).map(
			(kv_pair,v) => {
				return {
					key: kv_pair[0],
					state: kv_pair[1].state
				}
		});
	}

	// --- Methods ---

	private toObject(obj: [string, PoolItem]): PoolItemPair {
		return {
			key: obj[0],
			resource: obj[1]
		};
	}

	// sets every resource within the pool to the callback, either a variable or a function
	public initResources(callback: Object): Map<string, PoolItem> {
		this.callback = callback; // set the pool callback to be this functions callback, as this is what the pool covers now
		this.resources.forEach((item) => {
			item.initCallback(callback);
		})
		return this.resources;
	}

	protected getAnyStandbyResource(): PoolItemPair | undefined {
		const res = Array.from(this.resources.entries()).find(
			([key, value]) => value.state === PoolItemState.STANDBY
		)
		if (!res) return;
		return this.toObject(res);
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
			Logger.sendLog(LogLevel.Warning, ["Pool("+this.name+")", "requestForResource()"], formatError(PoolError.POOL_NO_RESOURCES_ON_STANDBY,this.name));
			return;
		}

		Logger.sendLog(LogLevel.Verbose, ["Pool("+this.name+")", "requestForResource()"], "Dispatched resource "+selectedResource.key);

		selectedResource.resource.setActive();
		return selectedResource;
	}

	public returnResource(resource: PoolItemPair) {
		resource.resource.setStandby();
		Logger.sendLog(LogLevel.Verbose, ["Pool("+this.name+")", "returnResource()"], resource.key+" Was returned back to "+this.name);
	}

	// TODO: Make this potentially on a cronjob, so the pool checks to repair any failures, or make it repair ON error instead
	public restartResource(resource: PoolItem): void;
	public restartResource(id: string): void;

	// TODO: make this wait until the resource is on standby
	/**
	 * WHY DOESNT IT SHOW THE DESCRIPTION OF THIS WHAT THE FUCK JSDOC
	 * @param search 
	 * @returns 
	 */
	public restartResource(search: PoolItem | string): void {
		function restart(target: PoolItem | [string, PoolItem]) {
			if (target instanceof PoolItem) {
				target.setShutdown();
				// @ts-ignore - `this` will always be passed in via call
				this.resources.delete(search);
			} else {
				target[1].setShutdown();
				// @ts-ignore - `this` will always be passed in via call
				this.resources.delete(target[0]);
			}

			// @ts-ignore - `this` will always be passed in via call
			this.resources.set("POOL"+this.poolSize, new PoolItem(this.callback));
		}
		
		if (typeof search === "string") { // is the search condition by key or value?
			const target = this.resources.get(search); // get the value by the key
			if (!target) return;

			Logger.sendLog(LogLevel.Verbose, ["Pool("+this.name+")", "restartResource()"], "Restarting "+search);
			restart.call(this, target);
		} else if (search instanceof PoolItem) {
			const target = Array.from(this.resources.entries()).find(
				([_,item]) => item === search
			); // get the value by the value
			if (!target) return;

			Logger.sendLog(LogLevel.Verbose, ["Pool("+this.name+")", "restartResource()"], "Restarting "+target[0]);
			restart.call(this, target);
		}
	}

}

export class FixedPool extends Pool {
	public readonly size: number;
	private _states: StatesObject = new StatesObject();

	constructor(
		name: string,
		size: number,
		callback?: Object
	) {
		super(name, callback);

		this._states.setTargetState(PoolItemState.STANDBY);
		this.size = size; // allow accessing the target size of the pool
		
		Logger.sendLog(LogLevel.Verbose, ["Pool("+name+")","constructor"], "Creating", size.toString(), "resources");
		for (let i: number = 0; i < size; i++) {
			this.resources.set("POOL"+i.toString(), new PoolItem(callback));
			this._states.addState("POOL"+i.toString(), PoolItemState.PREPARE);

		}
	}

	public get states(): StatesObject {
		return this._states;
	}
}

export class DynamicPool extends Pool {
	constructor(
		name: string,
		callback?: Object
	) {
		super(name, callback);
	}

	// adds a resource into the pool with the name as the lenght
	public addResource(callback?: PoolItem): void {
		this.resources.set(
			"POOL"+this.poolSize,
			new PoolItem(callback? callback : this.callback) // if callback isnt defined, fallback to the callback passed in the class
		);
	}

	// same as add resource but does it multiple times
	public addResources(size: number, callback?: PoolItem): void {
		for (let i = 0; i < size; i++) {
			this.resources.set(
				"POOL"+this.poolSize,
				new PoolItem(callback? callback : this.callback)
			);
		}
	}

	public removeResource(id: string): boolean {
		return this.resources.delete(id)
	}
}
// class PoolManager {
// 	constructor(pool: Pool) {

// 	}
// }
export function a() {

}
