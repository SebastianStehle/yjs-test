/* eslint-disable no-prototype-builtins */
import { Types, without } from './types';

type Mutator = {
    add: (item: string) => void;

    remove: (item: string) => void;
};

export class ImmutableSet {
    private static readonly EMPTY = new ImmutableSet({});

    public readonly __typeName = 'Set';

    public get length() {
        return Object.keys(this.items).length;
    }

    public [Symbol.iterator]() {
        return Object.keys(this.items)[Symbol.iterator]();
    }

    public has(item: string) {
        return this.items.hasOwnProperty(item);
    }

    private constructor(private readonly items: { [item: string]: boolean },
        public readonly __instanceId?: string
    ) {
        Object.freeze(items);
    }

    public static empty(): ImmutableSet {
        return ImmutableSet.EMPTY;
    }

    public static of(...items: string[]): ImmutableSet {
        if (!items || items.length === 0) {
            return ImmutableSet.EMPTY;
        } else {
            const itemMap: Record<string, boolean> = {};

            for (const item of items) {
                itemMap[item] = true;
            }

            return new ImmutableSet(itemMap);
        }
    }

    public add(item: string): ImmutableSet {
        if (!item || this.has(item)) {
            return this;
        }

        const items = { ...this.items, [item]: true };

        return new ImmutableSet(items);
    }

    public remove(item: string): ImmutableSet {
        if (!item || !this.has(item)) {
            return this;
        }

        const items = without(this.items, item);

        return new ImmutableSet(items);
    }

    public mutate(updater: (mutator: Mutator) => void) {
        const items = { ...this.items };

        let updated = false;

        updater({
            add: (k) => {
                if (k) {
                    if (!items.hasOwnProperty(k)) {
                        updated = true;

                        items[k] = true;
                    }
                }
            },
            remove: (k) => {
                if (k) {
                    if (items.hasOwnProperty(k)) {
                        updated = true;

                        delete items[k];
                    }
                }
            },
        });

        if (!updated) {
            return this;
        }

        return new ImmutableSet(items);
    }

    public equals(other: ImmutableSet) {
        if (!other) {
            return false;
        }

        return Types.equalsObject(this.items, other.items);
    }
}
