import { StateData } from '../types';

export class ClientState {
    private _data: StateData;

    constructor() {
        this._data = {};
    }

    get data(): StateData {
        return this._data;
    }

    set data(newData: StateData) {
        this._data = newData;
    }
}