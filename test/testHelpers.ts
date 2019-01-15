import * as msgpack from 'notepack.io';
import * as fossilDelta from 'fossil-delta';

export function applyPatches(oldState, patch) {
    const binaryPatch = Buffer.from(patch);
    const newState = Buffer.from(fossilDelta.apply(oldState, binaryPatch));
    return msgpack.decode(newState);
}