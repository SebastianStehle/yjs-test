/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'
import { isSameInstanceId, TypeProperties } from './identity';
import { ImmutableList } from './immutable-list';
import { ImmutableMap } from './immutable-map';
import { ImmutableObject } from './immutable-object';
import { ImmutableSet } from './immutable-set';
import { setSource } from './sync';
import { Types } from './types';

function valueToYJS(source: any) {
    if (source instanceof ImmutableList) {
        const items: any[] = [];

        for (const item of source) {
            items.push(valueToYJS(item));
        }

        const array = Y.Array.from(items);
        setSource(array, source);

        return array;
    } else if (source instanceof ImmutableMap) {
        const entries: { [key: string]: any } = {};

        for (const [key, value] of source) {
            entries[key] = valueToYJS(value);
        }

        const map = new Y.Map(entries as any);
        setSource(map, source);

        return map;
    } else if (source?.[TypeProperties.instanceId]) {
        const entries: { [key: string]: any } = {
            [TypeProperties.typeName]: source[TypeProperties.typeName]
        };

        for (const [key, value] of (source as ImmutableObject<any>)) {
            entries[key] = valueToYJS(value);
        }

        const map = new Y.Map(entries as any);
        setSource(map, source);

        return map;
    } else if (Types.isFunction(source?.['toJS'])) {
        return source['toJS']();
    } else {
        return source;
    }
}

function syncImmutable(current: any, previous: any, target: Y.AbstractType<any>) {
    setSource(target, current);

    switch (current.__typeName) {
        case 'List':
            syncList(current, previous, target as any);
            break;
        case 'Map':
            syncMap(current, previous, target as any);
            break;
        case 'Set':
            syncSet(current, previous, target as any);
            break;
        default:
            syncObject(current, previous, target as any);
            break;
    }
}

function syncList(current: ImmutableList<any>, previous: ImmutableList<any>, target: Y.Array<any>) {
    const minSize = Math.min(current.length, previous.length);

    for (let i = 0; i < minSize; i++) {
        const itemNew = current.get(i);
        const itemPrev = previous.get(i);

        // Nothing has been changed.
        if (itemNew === itemPrev) {
            continue;
        }

        if (isSameInstanceId(itemNew, itemPrev)) {
            syncImmutable(itemNew, itemPrev, target.get(i));
        } else {
            target.delete(i);
            target.insert(i, valueToYJS(itemNew));
        }
    }

    if (current.length > previous.length) {
        for (let i = previous.length; i < current.length; i++) {
            target.push(valueToYJS(current.get(i)));
        }
    } else {
        target.slice(current.length, previous.length - current.length);
    }
}

function syncSet(current: ImmutableSet, previous: ImmutableSet, target: Y.Map<boolean>) {
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

function syncMap(current: ImmutableMap<any>, previous: ImmutableMap<any>, target: Y.Map<any>) {
    for (const [key, valueNew] of current) {
        if (!previous.has(key)) {
            // The item has been added.
            target.set(key, valueToYJS(valueNew));
        }

        const valuePrev = previous.get(key);

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (isSameInstanceId(valueNew, valuePrev)) {
            syncImmutable(valueNew, valuePrev, target.get(key));
        } else {
            target.set(key, valueToYJS(valueNew));
        }
    }

    for (const [key] of current) {
        if (!current.has(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function syncObject(current: ImmutableObject<any>, previous: ImmutableObject<any>, target: Y.Map<any>) {
    for (const [key, valueNew] of current) {
        if (!previous.contains(key)) {
            // The item has been added.
            target.set(key, valueToYJS(valueNew));
        }

        const valuePrev = previous.get(key);

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (isSameInstanceId(valueNew, valuePrev)) {
            syncImmutable(valueNew, valuePrev, target.get(key));
        } else {
            target.set(key, valueToYJS(valueNew));
        }
    }

    for (const [key] of current) {
        if (!current.contains(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

export function syncToYJS(current: ImmutableObject<any>, previous: ImmutableObject<any>, target: Y.Map<any>) {
    syncObject(current, previous, target);
}