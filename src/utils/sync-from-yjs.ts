/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { TypeProperties } from './identity';
import { ImmutableList } from './immutable-list';
import { ImmutableMap } from './immutable-map';
import { ImmutableObject } from './immutable-object';
import { ImmutableSet } from './immutable-set';
import { createInstance, Factories, getEvent, getSource, getTarget, isInvalid, setEvent, setInvalid, setTarget } from './sync-utils';

function syncValue(source: any, factories: Factories) {
    if (!isInvalid(source)) {
        return source;
    }

    const typeName = source?.[TypeProperties.typeName];

    if (!typeName) {
        return source;
    }

    let result: any;
    if (typeName === 'List') {
        result = syncList(source, factories);
    } else if (typeName === 'Map') {
        result = syncMap(source, factories);
    } else if (typeName === 'Set') {
        result = syncSet(source);
    }  else {
        result = syncObject(source, factories);
    }

    setTarget(result, getTarget(source));
    return result;
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

        const event = getEvent(source);

        if (!event) {
            return;
        }

        const target = event.target as Y.Array<any>;
    
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
    });
}

function syncSet(source: ImmutableSet) {
    return source.mutate(mutator => {
        const event = getEvent(source);
    
        if (!event) {
            return;
        }

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
        
        const event = getEvent(source);
    
        if (!event) {
            return;
        }
    
        const target = event.target as Y.Map<any>;

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

    const event = getEvent(source);

    if (event) {
        const target = event.target as Y.Map<any>;

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

export function syncFromY<T extends ImmutableObject<any>>(source: T, events: ReadonlyArray<Y.YEvent<any>>, factories: Factories) {
    for (const event of events) {
        invalidate(event.target, event);
    }

    return syncObject(source, factories) as T;
}

export function initFromY<T>(source: Y.Map<any>, factories: Factories) {
    return createInstance(source, factories) as T;
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
