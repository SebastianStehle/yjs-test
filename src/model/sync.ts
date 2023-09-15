/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

export function setSource(target: Y.AbstractType<any>, source: any) {
    (target as any)['__source'] = source;
}

export function getSource(target: Y.AbstractType<any>) {
    return (target as any)['__source'];
}