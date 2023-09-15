/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Y from 'yjs';
import { createAction, Middleware, Reducer } from '@reduxjs/toolkit';
import { Factories } from './sync-utils';
import { syncToY } from './sync-to-yjs';
import { syncFromY } from './sync-from-yjs';

const syncAction = createAction<{ value: unknown; sliceName: string | undefined }>('SYNC_FROM_YJS');

export function bind(rootObject: Y.Map<any>, sliceName: string | undefined, factories: Factories) {
    
    const middleware = () => {
        const middleware: Middleware = store => {
            const getState = () => {
                let state = store.getState();

                if (sliceName) {
                    state = state[sliceName];   
                }
                
                return state;
            };

            rootObject.observeDeep((events, transition) => {
                if (transition.local) {
                    return;
                }
                const stateOld = getState();
                const stateNew = syncFromY<any>(stateOld, events, factories);

                if (stateOld !== stateNew) {
                    store.dispatch(syncAction({ value: stateNew, sliceName }));
                }   
            });
    
            rootObject.doc!.transact(() => {
                syncToY(getState(), null, rootObject);
            });
    
            return next => action => {
                const stateOld = getState();
    
                const result = next(action);
                
                if (!syncAction.match(action)) {
                    rootObject.doc!.transact(() => {
                        syncToY(getState(), stateOld, rootObject);
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
