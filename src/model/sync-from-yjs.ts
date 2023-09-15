/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'
import { TypeProperties } from './identity';
import { ImmutableList } from './immutable-list';
import { ImmutableMap } from './immutable-map';
import { ImmutableObject } from './immutable-object';
import { ImmutableSet } from './immutable-set';
import { getSource, setSource } from './sync';
import { Types } from './types';

export const SpecialProperties = {
    // To check which properties need to be tested.
    invalid: '__source',

    // The target event to apply.
    event: '__event',
}

type Factory = (value: any) => any;
type Factories = { [key: string]: Factory };

function createInstance(source: any, factories: Factories) {
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

function syncValue(source: any, factories: Factories) {
    if (!(source as  any)[SpecialProperties.invalid]) {
        return source;
    }

    const typeName = source?.[TypeProperties.typeName];

    if (!typeName) {
        return source;
    }

    if (typeName === 'List') {
        return syncList(source, factories);
    } else if (typeName === 'Map') {
        return syncMap(source, factories);
    } else if (typeName === 'Set') {
        return syncSet(source);
    }  else {
        return syncObject(source, factories);
    } 
}

function syncList(source: ImmutableList<any>, factories: Factories) {
    return source.mutate(mutator => {
        for (let i = 0; i < source.length; i++) {
            const itemOld = source.get(i);
            const itemNew = syncValue(itemOld, factories);

            if (itemOld !== itemNew) {
                mutator.set(i, itemNew);
            }
        }

        const event = (source as  any)[SpecialProperties.event] as Y.YMapEvent<any>;

        if (event) {
            const target = event.currentTarget as Y.Array<any>;
        
            event.changes.keys.forEach((change, id) => {
                const index = parseInt(id, 10);

                switch (change.action) {
                    case 'add':
                        mutator.insert(index, createInstance(target.get(index), factories));
                        break;
                    case 'update':
                        mutator.set(index, createInstance(target.get(index), factories));
                        break;
                    case 'delete':
                        mutator.removeAt(index);
                        break;
                }
            });
        }
    });
}

function syncSet(source: ImmutableSet) {
    return source.mutate(mutator => {    
        const event = (source as  any)[SpecialProperties.event] as Y.YEvent<any>;
    
        if (event) {    
            event.changes.keys.forEach((change, id) => {
                switch (change.action) {
                    case 'add':
                    case 'update':
                        mutator.add(id);
                        break;
                    case 'delete':
                        mutator.remove(id);
                }
            });
        }
    });
}

function syncMap(source: ImmutableMap<any>, factories: Factories) {
    return source.mutate(mutator => {
        for (const [key, valueOld] of source) {
            const valueNew = syncValue(valueOld, factories);
    
            if (valueNew !== valueOld) {
                mutator.set(key, valueNew);
            }
        }
    
        const event = (source as  any)[SpecialProperties.event] as Y.YEvent<any>;
    
        if (event) {
            const target = event.currentTarget as Y.Map<any>;
    
            event.changes.keys.forEach((change, id) => {
                switch (change.action) {
                    case 'add':
                    case 'update':
                        mutator.set(id, createInstance(target.get(id), factories));
                        break;
                    case 'delete':
                        mutator.remove(id);
                }
            });
        }
    });
}

function syncObject(source: ImmutableObject<any>, factories: Factories) {
    let changes: Record<string, any> | null = null;

    for (const [key, valueOld] of source) {
        const valueNew = syncValue(valueOld, factories);

        if (valueNew !== valueOld) {
            changes ||= {};
            changes[key] = valueNew;
        }
    }

    const event = (source as  any)[SpecialProperties.event] as Y.YEvent<any>;

    if (event) {
        const target = event.currentTarget as Y.Map<any>;

        event.changes.keys.forEach((change, id) => {
            switch (change.action) {
                case 'add':
                case 'update':
                    changes ||= {};
                    changes[id] = createInstance(target.get(id), factories);
                    break;
                case 'delete':
                    changes ||= {};
                    changes[id] = undefined;
            }
        });
    }

    return changes ? source.setMany(changes) : source;
}

export function syncFromY(source: ImmutableObject<any>, events: ReadonlyArray<Y.YEvent<any>>, factories: Factories) {
    for (const event of events) {
        invalidate(event.currentTarget, event)
    }

    return syncObject(source, factories);
}

function invalidate(target: Y.AbstractType<any> | null, event: Y.YEvent<any> | null) {
    if (!target) {
        return;
    }

    const value = getSource(target);
    
    if (value) {
        value[SpecialProperties.invalid] = true;
    }

    if (event) {
        value[SpecialProperties.event] = event;
    }

    invalidate(target.parent, null);
}
