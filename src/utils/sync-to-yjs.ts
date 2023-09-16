/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Y from 'yjs';
import { isSameInstanceId, TypeProperties } from './identity';
import { setSource } from './sync-internals';
import { getTypeName, SyncOptions } from './sync-utils';
import { Types } from './types';

function valueToY(source: any, options: SyncOptions) {
    if (!source) {
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

    const resolved = typeResolver.syncToYJS(source);

    if (Types.isObject(resolved)) {
        const entries: { [key: string]: any } = {
            [TypeProperties.typeName]: typeName
        };

        for (const [key, value] of source) {
            entries[key] = valueToY(value, options);
        }

        const map = new Y.Map(Object.entries(entries));
        setSource(map, source);

        return map;
    } else if (Types.isArray(resolved)) {
        const items: any[] = [
            { [TypeProperties.typeName]: typeName }
        ];

        for (const item of source) {
            items.push(valueToY(item, options));
        }

        const array = Y.Array.from(items);
        setSource(array, source);

        return array;
    }
    
    return source;
}

function diffValues(current: any, previous: any, target: any, options: SyncOptions) {
    if (!target) {
        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    if (Types.is(target, Y.Map)) {
        diffObjects(current, previous, target, options);
    } else if (Types.is(target, Y.Array)) {
        diffArrays(current, previous, target, options);
    }
    
    return false;
}

function diffObjects(current: any, previous: any, target: Y.Map<any>, options: SyncOptions) {
    const typeName = target.get(TypeProperties.typeName) as string;

    if (!typeName) {
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Object') {
        return;
    }
    
    const objCurrent = typeResolver.syncToYJS(current);
    const objPrevious = typeResolver.syncToYJS(previous);

    for (const [key, valueNew] of Object.entries(objCurrent)) {
        if (!objPrevious.hasOwnProperty(key)) {
            // The item has been added.
            target.set(key, valueToY(valueNew, options));
        }

        const valuePrev = objPrevious[key];

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (diffValues(valueNew, valuePrev, target.get(key), options)) {
            continue;
        }

        target.set(key, valueToY(valueNew, options));
    }

    for (const [key] of Object.keys(objPrevious)) {
        if (!objCurrent.hasOwnProperty(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function diffArrays(current: any, previous: any, target: Y.Array<any>, options: SyncOptions) {
    const typeName = getTypeName(target.get(0)) as string;

    if (!typeName) {
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Array') {
        return;
    }
    
    const arrayCurrent = typeResolver.syncToYJS(current);
    const arrayPrevious = typeResolver.syncToYJS(previous);

    const minSize = Math.min(arrayCurrent.length, arrayPrevious.length);

    for (let i = 0; i < minSize; i++) {
        const itemNew = arrayCurrent[i];
        const itemPrev = arrayPrevious[i];

        // Nothing has been changed.
        if (itemNew === itemPrev) {
            continue;
        }

        if (diffValues(itemNew, itemPrev, target.get(i), options)) {
            continue;
        }

        target.delete(i);
        target.insert(i, valueToY(itemNew, options));
    }

    if (current.length > previous.length) {
        for (let i = previous.length; i < current.length; i++) {
            target.push(valueToY(current.get(i), options));
        }
    } else {
        target.slice(current.length, previous.length - current.length);
    }
}

export function syncToY(current: any, previous: any, target: Y.AbstractType<any>, options: SyncOptions) {
    if (!previous) {
        return;
    } else {
        diffValues(current, previous, target, options);
    }
}