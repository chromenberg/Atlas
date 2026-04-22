import EventEmitter from "events";

export type State = any; // state can have any value

export interface StateObject {
  [key: symbol | string]: State
}

export const StateEvents = {
  StateAdded: "NEW_STATE",
  StateDeleted: "DEL_STATE",
  StateChanged: "STATE_CHANGE",
  StateTargetReached: "STATE_TARGET_REACHED"
}
//Todo: Make the states class based off of one superclass, and override the type of store there
/**
 * ---
 * `StateListener` listens to a state and will emit an event when a value is changed
 * 
 * ---
 * __Events__:
 * 
 * `NEW_STATE`: Emitted when a new state is appended into the state array
 * 
 * `DEL_STATE`: Emitted when a state is removed from the array
 * 
 * `STATE_CHANGE`: Emitted when a state changes
 * 
 * `STATE_TARGET_REACHED`: Emitted when the set target for all states is reached
 */
export class StateListener extends EventEmitter {
  protected _states: State;
  protected _targetState: State;
  constructor(
    initialStates?: State,
    targetState?: State
  ) {
    super();
    if (initialStates) { this._states = initialStates };
    if (targetState) { this._targetState = targetState };
  }

  public addState(state: State) {
    this._states = state;
    this.emit(StateEvents.StateAdded);
  }

  public changeState(state: State): void {
    this._states = state;
    this.emit(StateEvents.StateChanged);
    // check if every state is the target state and if so emit state ready
    if (state === this._targetState) {
      this.emit(StateEvents.StateTargetReached, this._states);
    }
  }
  public set targetState(state: State) {
    this._targetState = state;
  }

  public setTargetState(state: State): void {
    this._targetState = state;
  }
}

export class StatesObject extends EventEmitter {
  protected _states: StateObject = {};
  private _targetState: State;
  constructor(
    initialStates?: StateObject,
    targetState?: State
  ) {
    super(initialStates);
    if (initialStates) { this._states = initialStates };
    if (targetState) { this._targetState = targetState };
  }

  public addState(key: string | symbol, state: State): void {
    this._states[key] = state;
    this.emit(StateEvents.StateAdded);
  }

  public changeState(key: string | symbol, state: State): void {
    this._states[key] = state;
    this.emit(StateEvents.StateChanged);
    // check if every state is the target state and if so emit state ready
    if (Object.values(this._states).every(state => state === this._targetState)) {
      this.emit(StateEvents.StateTargetReached, this._states);
    }
  }

  public set targetState(state: State) {
    this._targetState = state;
  }

  public setTargetState(state: State): void {
    this._targetState = state;
  }
}