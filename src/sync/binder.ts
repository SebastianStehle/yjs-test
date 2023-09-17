/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Y from 'yjs';
import { createAction, Middleware, Reducer } from '@reduxjs/toolkit';
import { initToYJS, syncToYJS } from './sync-to-yjs';
import { syncFromYJS } from './sync-from-yjs';
import { SyncOptions } from './sync-utils';

const syncAction = createAction<{ value: unknown; sliceName: string | undefined }>('SYNC_FROM_YJS');

export function bind(doc: Y.Doc, sliceName: string | undefined, options: SyncOptions) {
    const middleware = () => {
        const middleware: Middleware = store => {
            const getState = () => {
                let state = store.getState();

                if (sliceName) {
                    state = state[sliceName];   
                }
                
                return state;
            };

            let root: Y.AbstractType<any>;
            doc.transact(() => {
                root = initToYJS(getState(), doc, sliceName, options);
            });

            root!.observeDeep((events, transition) => {
                if (transition.local) {
                    return;
                }

                const stateOld = getState();
                const stateNew = syncFromYJS<any>(stateOld, events, options);

                if (stateOld !== stateNew) {
                    store.dispatch(syncAction({ value: stateNew, sliceName }));
                }   
            });
    
            return next => action => {
                const stateOld = getState();
    
                const result = next(action);
                
                if (!syncAction.match(action)) {
                    doc.transact(() => {
                        syncToYJS(getState(), stateOld, root, options);
                    });
                }
    
                return result;
            };
        };
    
        return middleware;
    };

    const enhanceReducer = <S>(currentReducer: Reducer<S>): Reducer<S> => {
        const reducer: Reducer<S> = (state, action) => {
            if (syncAction.match(action)) {
                if (action.payload.sliceName) {
                    return {
                        ...state,
                        [action.payload.sliceName]: action.payload.value
                    } as S;
                } else {
                    return action.payload.value as S;
                }
            }
            
            return currentReducer(state, action);
        };

        return reducer;
    };

    return { middleware, enhanceReducer };
}
