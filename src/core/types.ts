export interface State { data: StateData }
export type StateData = { [key: string]: StateDatum }
export type StateDatum = Object | number | string;
