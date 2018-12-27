export type StateData = Object | number | string;

export class ChannelState {
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