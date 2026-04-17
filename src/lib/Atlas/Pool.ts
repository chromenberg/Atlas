import { Logger, LogLevel } from "../../../../Logging/dist/Logger.js";


enum PoolItemState {
	PREPARE,
	STANDBY,
	ACTIVE
}

interface PoolStates {
	key: string
	state: PoolItemState
}

// contains the state and callback of a item used in the pool
class PoolItem {
	private _state: number;
	constructor(
		private callback?: Object
	) {
		this._state = this.callback? PoolItemState.STANDBY : PoolItemState.PREPARE;
	}
	// allow for defining no callback and then add the callback later on
	public initCallback(callback: Object): void {
		if (this.callback) {
			Logger.sendLog(LogLevel.Error, ["Pool","PoolItem","initCallback()"], "Refusing to initialize callback value as a callback is already present");
			return;
		}

		this.callback = callback;
		this._state = PoolItemState.STANDBY;
	}

	public get state(): PoolItemState {
		return this._state;
	}
}

class Pool {
	private resources: Map<string, PoolItem> = new Map<string, PoolItem>;
	constructor() {
		for (let i: number = 0; i <= 10; i++) {
			this.resources.set("POOL_"+i.toString(), new PoolItem());
			Logger.sendLog(LogLevel.Verbose, ["Pool","constructor"], "Created Pooling Resource #POOL_"+i.toString());
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

	public initResources(callback?: Object): void {
		this.resources.forEach((item) => {
			item.initCallback(()=>{
				console.log("")
			})
		})
	}
}


// class PoolManager {
// 	constructor(pool: Pool) {

// 	}
// }

export function a() {

}