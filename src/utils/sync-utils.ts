/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'
import { TypeProperties } from './identity';
import { ImmutableList } from './immutable-list';
import { ImmutableMap } from './immutable-map';
import { ImmutableSet } from './immutable-set';
import { Types } from './types';

export function setSource(target: Y.AbstractType<any>, source: any) {
    (target as any)['__source'] = source;
}

export function getSource(target: Y.AbstractType<any>) {
    return (target as any)['__source'];
}

export function setEvent(target: unknown, event: Y.YEvent<any>) {
    (target as any)['__event'] = event;
}

export function getEvent(target: unknown): Y.YEvent<any> | undefined {
    return (target as any)['__event'];
}

export function setInvalid(target: unknown, invalid = true) {
    (target as any)['__invalid'] = invalid;
}

export function isInvalid(target: unknown) {
    return (target as any)['__invalid'] === true;
}

export type Factory = (value: any) => any;

export type Factories = { [key: string]: Factory };

export function createInstance(source: any, factories: Factories) {
    if (Types.is(source, Y.Map)) {
        const values: Record<string, any> = {};

        for (const [key, value] of source.entries()) {
            values[key] = createInstance(value, factories);
        }

        const typeName = source.get(TypeProperties.typeName) as string;

        if (!typeName) {
            return values;
        }

        let result: any;
        if (typeName === 'Map') {
            result = ImmutableMap.of(values);
        } else if (typeName === 'Set') {
            result = ImmutableSet.of(...Object.keys(values));
        } else {
            result = factories[typeName](values);
        }

        setSource(source, result);
        return result;
    } else if (Types.is(source, Y.Array)) {
        const values: any[] = source.map(i => createInstance(i, factories));

        const result = ImmutableList.of(values);

        setSource(source, result);
        return result;
    }

    return source;
}