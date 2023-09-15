/* eslint-disable @typescript-eslint/no-explicit-any */
import { configureStore, createAction, Middleware } from '@reduxjs/toolkit'
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { syncToY } from './../utils/sync-to-yjs';
import { Root, TaskItem, TaskList } from './state';
import tasksReducer, { initTasks } from './reducer';
import { initFromY, syncFromY } from '../utils/sync-from-yjs';
import { Factories } from '../utils/sync-utils';

const ydoc = new Y.Doc()
const yroot = ydoc.getMap();

const provider = new WebrtcProvider('demo-room2', ydoc);

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

const initAction = createAction<Y.Map<any>>('INIT_FROM_YS');

const syncMiddleware = () => {
    let didConnect = false;

    const middleware: Middleware = store => {
        provider.on('status', ({ status }: { status: 'connecting' | 'disconnected' | 'connected' }) => {
            if (status !== 'connected' || didConnect) {
                return;
            }

            didConnect = true;
        });

        if (yroot.size === 0) {
            store.dispatch(initTasks());
        } else {
            store.dispatch(initAction(yroot));
        }

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
                };
            } else if (initAction.match(action)) {
                const stateOld = store.getState();

                return {
                    ...stateOld,
                    tasks: initFromY(action.payload, factories)
                };
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
