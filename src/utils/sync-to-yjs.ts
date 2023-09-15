/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { isSameInstanceId, TypeProperties } from './identity';
import { ImmutableList } from './immutable-list';
import { ImmutableMap } from './immutable-map';
import { ImmutableObject } from './immutable-object';
import { ImmutableSet } from './immutable-set';
import { setSource } from './sync-utils';
import { Types } from './types';

function valueToY(source: any) {
    if (source instanceof ImmutableList) {
        const items: any[] = [];

        for (const item of source) {
            items.push(valueToY(item));
        }

        const array = Y.Array.from(items);
        setSource(array, source);

        return array;
    } else if (source instanceof ImmutableMap) {
        const entries: { [key: string]: any } = {
            [TypeProperties.typeName]: source.__typeName
        };

        for (const [key, value] of source) {
            entries[key] = valueToY(value);
        }

        const map = new Y.Map(Object.entries(entries));
        setSource(map, source);

        return map;
    } else if (source?.[TypeProperties.instanceId]) {
        const entries: { [key: string]: any } = {
            [TypeProperties.typeName]: source.__typeName
        };

        for (const [key, value] of (source as ImmutableObject<any>)) {
            entries[key] = valueToY(value);
        }

        const map = new Y.Map(Object.entries(entries));
        setSource(map, source);

        return map;
    } else if (Types.isFunction(source?.['toJS'])) {
        return source['toJS']();
    } else {
        return source;
    }
}

function syncImmutable(current: any, previous: any, target: unknown) {
    if (!target) {
        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    if (Types.is(target, Y.Map)) {
        const typeName = target.get(TypeProperties.typeName);

        if (!typeName) {
            return false;
        }
   
        // Type names do not match.
        if (current?.[TypeProperties.typeName] !== typeName || previous?.[TypeProperties.typeName] !== typeName) {
            return false;
        }

        if (typeName === 'Map') {
            syncMap(current, previous, target);
            return true;
        } else if (typeName === 'Set') {
            syncSet(current, previous, target as any);
            return true;
        } else {
            syncObject(current, previous, target);
            return true;
        }
    } else if (Types.is(target, Y.Array)) {
        if (Types.is(current, ImmutableList) && Types.is(previous, ImmutableList)) {            
            syncList(current, previous, target);
        }
    }
    
    return false;
}

function syncList(current: ImmutableList<any>, previous: ImmutableList<any>, target: Y.Array<any>) {
    setSource(target, current);

    const minSize = Math.min(current.length, previous.length);

    for (let i = 0; i < minSize; i++) {
        const itemNew = current.get(i);
        const itemPrev = previous.get(i);

        // Nothing has been changed.
        if (itemNew === itemPrev) {
            continue;
        }

        if (syncImmutable(itemNew, itemPrev, target.get(i))) {
            continue;
        }

        target.delete(i);
        target.insert(i, valueToY(itemNew));
    }

    if (current.length > previous.length) {
        for (let i = previous.length; i < current.length; i++) {
            target.push(valueToY(current.get(i)));
        }
    } else {
        target.slice(current.length, previous.length - current.length);
    }
}

function syncSet(current: ImmutableSet, previous: ImmutableSet, target: Y.Map<boolean>) {
    setSource(target, current);

    for (const key of current) {
        if (!previous.has(key)) {
            // The item has been added.
            target.set(key, true);
        }
    }

    for (const key of Object.keys(previous)) {
        if (!current.has(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function syncMap(current: ImmutableMap<any>, previous: ImmutableMap<any>, target: Y.Map<unknown>) {
    setSource(target, current);

    for (const [key, valueNew] of current) {
        if (!previous.has(key)) {
            // The item has been added.
            target.set(key, valueToY(valueNew));
        }

        const valuePrev = previous.get(key);

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (syncImmutable(valueNew, valuePrev, target.get(key))) {
            continue;
        }

        target.set(key, valueToY(valueNew));
    }

    for (const [key] of previous) {
        if (!current.has(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function syncObject(current: ImmutableObject<any>, previous: ImmutableObject<any>, target: Y.Map<any>) {
    setSource(target, current);
    
    for (const [key, valueNew] of current) {
        if (!previous.contains(key)) {
            // The item has been added.
            target.set(key, valueToY(valueNew));
        }

        const valuePrev = previous.get(key);

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (syncImmutable(valueNew, valuePrev, target.get(key))) {
            continue;
        }

        target.set(key, valueToY(valueNew));
    }

    for (const [key] of current) {
        if (!current.contains(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function syncInitial(current: ImmutableObject<any>, target: Y.Map<any>) {
    setSource(target, current);
    
    for (const [key, valueNew] of current) {
        target.set(key, valueToY(valueNew));
    }
}

export function syncToY(current: ImmutableObject<any>, previous: ImmutableObject<any> | null, target: Y.Map<any>) {
    if (!previous) {
        syncInitial(current, target);
    } else {
        syncObject(current, previous, target);
    }
}