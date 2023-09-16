/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Y from 'yjs';
import { getTypeName, isSameInstanceId, TypeProperties } from './identity';
import { setSource } from './sync-internals';
import { SourceArray, SourceObject, SyncOptions } from './sync-utils';
import { Types } from './types';

function valueToY(source: any, options: SyncOptions, doc?: Y.Doc, sliceName?: string) {
    if (!source) {
        return source;
    }

    const typeName = getTypeName(source);

    if (!typeName) {
        if (options.syncAlways) {
            if (Types.isArray(source)) {
                return valueToYArray(source, source, [], options, doc, sliceName);
            }
            
            if (Types.isObject(source)) {
                return valueToYObject(source, source, {}, options, doc, sliceName);
            }
        }

        return source;
    }

    const valueResolver = options.valueResolvers[typeName];

    if (valueResolver) {
        const result = valueResolver.fromValue(source);

        // Also set the type name so that we can read from it.
        result[TypeProperties.typeName] = typeName;
        return result;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver) {
        throw new Error(`Cannot find type resolver for '${typeName}.`);
    }

    if (typeResolver.sourceType === 'Object') {
        const initial: Record<string, any> = {
            [TypeProperties.typeName]: typeName
        };
        
        return valueToYObject(source, typeResolver.syncToYJS(source), initial, options, doc);
    } else {
        const initial: any[] = [
            { [TypeProperties.typeName]: typeName }
        ];
        
        return valueToYArray(source, typeResolver.syncToYJS(source), initial, options, doc);
    }
}

function valueToYObject(source: any, values: SourceObject, initial: Record<string, object>, options: SyncOptions, doc?: Y.Doc, sliceName?: string) {
    let map: Y.Map<unknown>;
    if (doc) {
        map = doc.getMap(sliceName);
    } else {
        map = new Y.Map();
    }

    for (const [key, value] of Object.entries(initial)) {
        map.set(key, value);
    }

    for (const [key, value] of Object.entries(values)) {
        map.set(key, valueToY(value, options));
    }

    setSource(map, source);
    return map;
}

function valueToYArray(source: any, values: SourceArray, initial: any[], options: SyncOptions, doc?: Y.Doc, sliceName?: string) {
    let array: Y.Array<unknown>;
    if (doc) {
        array = doc.getArray(sliceName);
    } else {
        array = new Y.Array();
    }

    array.push(initial);
    array.push(values.map(v => valueToY(v, options)));

    setSource(array, source);
    return array;
}

function diffValues(current: any, previous: any, target: any, options: SyncOptions) {
    if (!target) {
        return false;
    }

    if (Types.is(target, Y.Map)) {
        return diffObjects(current, previous, target, options);
    } else if (Types.is(target, Y.Array)) {
        return diffArrays(current, previous, target, options);
    }
    
    return false;
}

function diffObjects(current: any, previous: any, target: Y.Map<any>, options: SyncOptions) {
    const typeName = target.get(TypeProperties.typeName) as string;

    if (!typeName) {
        if (options.syncAlways && Types.isObject(current) && Types.isObject(previous)) {
            diffObjectsCore(current, previous, target, options);
            return true;
        }

        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Object') {
        throw new Error(`Cannot find type resolver for '${typeName}.`);
    }
    
    const objCurrent = typeResolver.syncToYJS(current);
    const objPrevious = typeResolver.syncToYJS(previous);

    diffObjectsCore(objCurrent, objPrevious, target, options);
    return true;
}

function diffObjectsCore(current: SourceObject, previous: SourceObject, target: Y.Map<any>, options: SyncOptions) {
    for (const [key, valueNew] of Object.entries(current)) {
        if (!previous.hasOwnProperty(key)) {
            // The item has been added.
            target.set(key, valueToY(valueNew, options));
            continue;
        }

        const valuePrev = previous[key];

        // Nothing has been changed.
        if (valueNew === valuePrev) {
            continue;
        }

        if (diffValues(valueNew, valuePrev, target.get(key), options)) {
            continue;
        }

        target.set(key, valueToY(valueNew, options));
    }

    for (const key of Object.keys(previous)) {
        if (!current.hasOwnProperty(key)) {
            // The item has been removed.
            target.delete(key);
        }
    }
}

function diffArrays(current: any, previous: any, target: Y.Array<any>, options: SyncOptions) {
    const typeName = getTypeName(target.get(0)) as string;

    if (!typeName) {
        if (options.syncAlways && Types.isArray(current) && Types.isArray(previous)) {
            diffArraysCore(current, previous, target, options);
            return true;
        }

        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Array') {
        throw new Error(`Cannot find type resolver for '${typeName}.`);
    }
    
    const arrayCurrent = typeResolver.syncToYJS(current);
    const arrayPrevious = typeResolver.syncToYJS(previous);

    diffArraysCore(arrayCurrent, arrayPrevious, target, options);
    return true;
}

function diffArraysCore(current: SourceArray, previous: SourceArray, target: Y.Array<any>, options: SyncOptions) {
    const minSize = Math.min(current.length, previous.length);

    for (let i = 0; i < minSize; i++) {
        const itemNew = current[i];
        const itemPrev = previous[i];

        // Nothing has been changed.
        if (itemNew === itemPrev) {
            continue;
        }

        if (diffValues(itemNew, itemPrev, target.get(i), options)) {
            continue;
        }

        target.delete(i);
        target.insert(i, [valueToY(itemNew, options)]);
    }

    if (current.length > previous.length) {
        const items: any[] = [];
    
        for (let i = previous.length; i < current.length; i++) {
            items.push(valueToY(current[i], options));
        }

        target.push(items);
    } else {
        target.delete(current.length, previous.length - current.length);
    }
}

export function syncToYJS(current: any, previous: any, target: Y.AbstractType<any>, options: SyncOptions) {
    diffValues(current, previous, target, options);
}

export function initToYJS(current: any, doc: Y.Doc, sliceName: string | undefined, options: SyncOptions) {
    const result = valueToY(current, options, doc, sliceName);

    if (!(result instanceof Y.Array) && !(result instanceof Y.Map)) {
        throw new Error('Root object must map to a yjs object.');
    }

    return result;
}