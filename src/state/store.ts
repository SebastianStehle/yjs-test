/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { Root, TaskItem, TaskList } from './state';
import tasksReducer from './reducer';
import { Factories } from '../utils/sync-utils';
import { bind } from '../utils/binder';

const ydoc = new Y.Doc();
const yroot = ydoc.getMap();

new WebrtcProvider('demo-room4', ydoc);

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
};

const binder = bind(yroot, 'tasks', factories);

export const store = configureStore({
    reducer: binder.enhanceReducer(combineReducers({
        tasks: tasksReducer
    })),
    middleware: [binder.middleware()]
});

export type RootState = ReturnType<typeof store.getState>;
