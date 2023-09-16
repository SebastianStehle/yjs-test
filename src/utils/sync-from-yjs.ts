/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { createInstance, getSource, getTarget, setTarget } from './sync-internals';
import { ArrayDiff, ArrayTypeResolver, getTypeName, ObjectDiff, ObjectTypeResolver, SyncOptions } from './sync-utils';

function syncValue(source: any, options: SyncOptions) {
    if (!isInvalid(source)) {
        return source;
    }

    const event = getEvent(source);

    if (!event) {
        return source;
    }

    const typeName = getTypeName(source);

    if (!typeName) {
        return source;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver) {
        return source;
    }

    let result: any;
    if (typeResolver.sourceType === 'Array') {
        result = syncFromArray(source, typeResolver, event, options);
    } else {
        result = syncFromObject(source, typeResolver, event, options);
    }

    setTarget(result, getTarget(source));
    return result;
}

function syncFromArray(source: any, typeResolver: ArrayTypeResolver<any>, event: Y.YEvent<any>, options: SyncOptions) {

    const target = event.target;

    if (!(target instanceof Y.Array<any>)) {
        throw new Error('Invalid sync target.');
    }

    const diffs: ArrayDiff[] = [];
    
    event.changes.keys.forEach((change, key) => {
        const index = parseInt(key, 10);

        switch (change.action) {
            case 'add':
                diffs.push({ type: 'Insert', index, value: createInstance(target.get(index), options) });
                break;
            case 'update':
                diffs.push({ type: 'Set', index, value: createInstance(target.get(index), options) });
                break;
            case 'delete':
                diffs.push({ type: 'Delete', index });
                break;
        }
    });
    
    return typeResolver.syncToObject(source, diffs);
}

function syncFromObject(source: any, typeResolver: ObjectTypeResolver<any>, event: Y.YEvent<any>, options: SyncOptions) {
    const target = event.target;

    if (!(target instanceof Y.Map<any>)) {
        throw new Error('Invalid sync target.');
    }

    const diffs: ObjectDiff[] = [];
    
    event.changes.keys.forEach((change, key) => {
        switch (change.action) {
            case 'add':
                diffs.push({ type: 'Set', key, value: createInstance(target.get(key), options) });
                break;
            case 'update':
                diffs.push({ type: 'Set', key, value: createInstance(target.get(key), options) });
                break;
            case 'delete':
                diffs.push({ type: 'Remove', key });
                break;
        }
    });
    
    return typeResolver.syncToObject(source, diffs);
}

export function syncFromY<T>(source: T, events: ReadonlyArray<Y.YEvent<any>>, options: SyncOptions) {
    for (const event of events) {
        invalidate(event.target, event);
    }

    return syncValue(source, options) as T;
}

function invalidate(target: Y.AbstractType<any> | null, event: Y.YEvent<any> | null) {
    if (!target) {
        return;
    }

    const source = getSource(target);

    if (source && event) {
        setEvent(source, event);
    }

    if (isInvalid(source)) {
        return;
    }
    
    if (source) {
        setInvalid(source);
    }

    invalidate(target.parent, null);
}

function setEvent(target: unknown, event: Y.YEvent<any>) {
    (target as any)['__event'] = event;
}

function getEvent(target: unknown): Y.YEvent<any> | undefined {
    return (target as any)?.['__event'];
}

function setInvalid(target: unknown, invalid = true) {
    (target as any)['__invalid'] = invalid;
}

function isInvalid(target: unknown) {
    return (target as any)?.['__invalid'] === true;
}