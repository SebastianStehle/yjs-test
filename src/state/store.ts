/* eslint-disable @typescript-eslint/no-explicit-any */
import { configureStore, createAction, Middleware } from '@reduxjs/toolkit'
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { syncToY } from './../utils/sync-to-yjs';
import { Root, TaskItem, TaskList } from './state';
import tasksReducer from './reducer';
import { Factories, syncFromY } from '../utils/sync-from-yjs';

const ydoc = new Y.Doc()
const yroot = ydoc.getMap();

new WebrtcProvider('demo-room', ydoc);

const factories: Factories = {
    Root: values => {
        return new Root(values);
    },
    TaskList: values => {
        return new TaskList(values);
    },
    TaskItem: values => {
        return new TaskItem(values);
    }
}

const syncAction = createAction<Y.YEvent<any>[]>('SYNC_FROM_YJS');

const syncMiddleware = () => {
    const middleware: Middleware = store => {
        function sync() {        
            syncToY(store.getState().tasks, new Root(), yroot);
        }
        
        sync();

        yroot.observeDeep((events, transition) => {
            if (transition.local) {
                return;
            }

            store.dispatch(syncAction(events));
        });

        return next => action => {
            const stateOld = store.getState();

            if (syncAction.match(action)) {
                const stateOld = store.getState();

                return {
                    ...stateOld,
                    tasks: syncFromY(stateOld.tasks, action.payload, factories)
                }
            }

            const result = next(action);
            
            ydoc.transact(() => {
                syncToY(store.getState().tasks, stateOld.tasks, yroot);
            });

            return result;
        };
    }

    return middleware;
};

export const store = configureStore({
    reducer: {
        tasks: tasksReducer
    },
    middleware: [syncMiddleware()]
});

export type RootState = ReturnType<typeof store.getState>
