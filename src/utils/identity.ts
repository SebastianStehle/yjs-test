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
};

export function getInstanceId(target: unknown) {
    return (target as any)?.[TypeProperties.instanceId] as string | undefined | null;
}

export function getTypeName(target: unknown) {
    return (target as any)?.[TypeProperties.typeName] as string | undefined | null;
}

export function isSameInstanceId(current: any, previous: any) {
    const currentId = current?.[TypeProperties.instanceId];

    if (!currentId) {
        return false;
    }

    return currentId == previous?.[TypeProperties.instanceId];
}