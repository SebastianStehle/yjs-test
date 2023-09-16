/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { TypeProperties } from './identity';
import { getTypeName, SyncOptions } from './sync-utils';
import { Types } from './types';

export function setSource(target: Y.AbstractType<any>, source: any) {
    (target as any)['__source'] = source;
    (source as any)['__target'] = target;
}

export function setTarget(source: any, target: Y.AbstractType<any>) {
    (target as any)['__source'] = source;
    (source as any)['__target'] = target;
}

export function getSource(target: Y.AbstractType<any>) {
    return (target as any)?.['__source'];
}

export function getTarget(target: Y.AbstractType<any>) {
    return (target as any)?.['__target'];
}

export function createInstance(source: any, options: SyncOptions) {
    let result: any;

    if (Types.is(source, Y.Map)) {
        result = createFromMap(source, options);
    } else if (Types.is(source, Y.Array)) {
        result = createFromArray(source, options);
    }

    setSource(source, result);
    return source;
}

function createFromMap(source: Y.Map<any>, options: SyncOptions) {
    let typeName: string | null  = null;

    const values: Record<string, any> = {};

    for (const [key, value] of source.entries()) {
        if (TypeProperties.typeName === key) {
            typeName = value;
            continue;
        }
            
        values[key] = createInstance(value, options);
    }

    if (!typeName) {
        return values;
    }
    
    const typeResolver = options.typeResolvers[typeName];
    
    if (!typeResolver || typeResolver.sourceType !== 'Object') {
        return source;
    }

    return typeResolver.create(values);
}

function createFromArray(source: Y.Array<any>, options: SyncOptions) {
    let typeName: string | null  = null;

    const values: any[] = [];

    let index = 0;
    for (const value of source) {
        if (index === 0) {
            const candidate = getTypeName(value);

            if (candidate) {
                typeName = candidate;
                continue;
            }
        }

        values.push(createInstance(value, options));
        index++;
    }

    if (!typeName) {
        return values;
    }
    
    const typeResolver = options.typeResolvers[typeName];
    
    if (!typeResolver || typeResolver.sourceType !== 'Array') {
        return source;
    }

    return typeResolver.create(values);
}