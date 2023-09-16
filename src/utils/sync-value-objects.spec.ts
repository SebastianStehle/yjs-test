/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from 'vitest';
import * as Y from 'yjs';
import { syncFromYJS } from './sync-from-yjs';
import { initToYJS, syncToYJS } from './sync-to-yjs';
import { SourceObject, SyncOptions, ValueResolver } from './sync-utils';

export class Color {
    public readonly __typeName = Color.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableList';

    public constructor(
        public readonly value: string
    ) {
    }
}

export class ColorValueResolver implements ValueResolver<Color> {
    public static readonly INSTANCE = new ColorValueResolver();

    public static readonly TYPE_NAME = Color.TYPE_NAME;

    private constructor() {
    }

    public fromYJS(source: SourceObject): Color {
        return new Color(source['value'] as string);
    }

    public fromValue(source: Color): Readonly<{ [key: string]: unknown; }> {
        return { value: source.value };
    }
}

const options: SyncOptions = {
    typeResolvers: {},
    valueResolvers: {
        [ColorValueResolver.TYPE_NAME]: ColorValueResolver.INSTANCE
    },
    syncAlways: true
};

test('should add value type', () => {
    const initial = () => ({});

    const update = {
        color: new Color('yellow'),
    };

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
    expect(result.color instanceof Color).toBeTruthy();
});

test('should replace value type', () => {
    const initial = () => ({
        color: new Color('red'),
    });

    const update = {
        color: new Color('green'),
    };

    const result = testInitialSync(initial, (root, prev) => syncToYJS(update, prev, root, options));

    expect(result).toEqual(update);
    expect(result.color instanceof Color).toBeTruthy();
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