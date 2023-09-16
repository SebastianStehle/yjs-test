/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from 'vitest';
import * as Y from 'yjs';
import { syncFromYJS } from './sync-from-yjs';
import { initToYJS, syncToYJS } from './sync-to-yjs';
import { SyncOptions } from './sync-utils';

const options: SyncOptions = {
    typeResolvers: {},
    valueResolvers: {},
    syncAlways: true
};

test('should add item to existing array', () => {
    const initial = () => [
        13,
    ];

    const update = [
        13, 42,
    ];

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

test('should add item to empty array', () => {
    const initial = () => [];

    const update = [
        42,
    ];

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

test.only('should remove item from array', () => {
    const initial = () => [
        13,
        42
    ];

    const update = [
        42,
    ];

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

test('should add property to object', () => {
    const initial = () => ({});

    const update = {
        newKey: 'Hello World'
    };

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

test('should update property in object', () => {
    const initial =  () => ({
        updatedKey: 'Hello World'
    });

    const update = {
        updatedKey: 'Hello YJS'
    };

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

test('should remove property from object', () => {
    const initial = () => ({
        removedKey: 'Hello World'
    });

    const update = {
    };

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
});

function testInitialSync(initial: () => any, update: (root: Y.AbstractType<any>, prev: any) => void) {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc2, update); 
    });

    doc2.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc1, update); 
    });

    const initial1 = initial();
    const initial2 = initial();

    const root1 = initToYJS(initial1, doc1, 'slice', options);
    const root2 = initToYJS(initial2, doc2, 'slice', options);

    const state = {
        synced: initial2
    };

    root2.observeDeep((events: any) => {
        state.synced = syncFromYJS(initial2, events, options);
    });

    doc1.transact(() => {
        update(root1, initial1);
    });

    doc1.destroy();
    doc2.destroy();

    return state.synced;
}