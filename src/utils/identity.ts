/* eslint-disable @typescript-eslint/no-explicit-any */
let start = 0;

export function idGenerator() {
    return `${start++}`;
}

export interface HasIdentity {
    __instanceId?: string;
}

export const TypeProperties = {
    instanceId: '__instanceId',

    // Used to identity the type name of previous files.
    typeName: '__typeName',

    // To source value.
    source: '__source',
}

export function isSameInstanceId(current: any, previous: any) {
    const currentId = current?.[TypeProperties.instanceId];

    if (!currentId) {
        return false;
    }

    return currentId == previous?.[TypeProperties.instanceId];
}