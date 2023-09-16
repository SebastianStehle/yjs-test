/* eslint-disable @typescript-eslint/no-explicit-any */
export const TypeProperties = {
    instanceId: '__instanceId',

    // Used to identity the type name of previous files.
    typeName: '__typeName',
};

export type SyncOptions = {
    // The type resolvers.
    typeResolvers: Record<string, ObjectTypeResolver<unknown> | ArrayTypeResolver<unknown>>;

    // The strategy to use when deciding what to sync.
    strategy: SyncStrategy;
};

export function getInstanceId(target: unknown) {
    return (target as any)?.[TypeProperties.instanceId] as string | undefined | null;
}

export function getTypeName(target: unknown) {
    return (target as any)?.[TypeProperties.typeName] as string | undefined | null;
}

export type SyncStrategy = 'Always' | 'IsEntity';

export type ArrayDiff = ArrayInsert | ArraySet | ArrayDeletion;

export type ArrayBaseDiff = { index: number; };

export type ArrayInsert = { type: 'Insert', value: unknown } & ArrayBaseDiff;

export type ArraySet = { type: 'Set', value: unknown } & ArrayBaseDiff;

export type ArrayDeletion = { type: 'Delete' } & ArrayBaseDiff;

export type ObjectDiff = ObjectSet | ObjectRemove;

export type ObjectBaseDiff = { key: string; };

export type ObjectSet = { type: 'Set', value: unknown } & ObjectBaseDiff;

export type ObjectRemove = { type: 'Remove' } & ObjectBaseDiff;

export type SourceObject = Readonly<Record<string, unknown>>;

export type SourceArray = ReadonlyArray<unknown>;

export interface TypeResolver<T, TSource, TDiff> {
    create(source: TSource): T;

    syncToYJS(value: T): TSource;

    syncToObject(existing: T, diffs: TDiff[]): T;
}

export interface ObjectTypeResolver<T> extends TypeResolver<T, SourceObject, ObjectDiff> {
    sourceType: 'Object';
}

export interface ArrayTypeResolver<T> extends TypeResolver<T, SourceArray, ArrayDiff> {
    sourceType: 'Array';
}