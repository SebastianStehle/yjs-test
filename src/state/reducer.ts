import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Root, TaskItem, TaskList } from './state'

const initialState = new Root();

export const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        initTasks: () => {
            return new Root()
                .add(
                    new TaskList()
                        .add(new TaskItem().setTitle('Task1'))
                        .add(new TaskItem().setTitle('Task2')))
                .add(
                    new TaskList()
                        .add(new TaskItem().setTitle('Task3'))
                        .add(new TaskItem().setTitle('Task4')));
        },
        addList: (state) => {
            return state?.add(new TaskList());
        },
        deleteList: (state, action: PayloadAction<{ listId: string }>) => {
            return state?.remove(action.payload.listId);
        },
        addTask: (state, action: PayloadAction<{ listId: string }>) => {
            return state?.updateList(action.payload.listId,
                list => list.add(new TaskItem()));
        },
        deleteTask: (state, action: PayloadAction<{ listId: string; taskId: string }>) => {
            return state?.updateList(action.payload.listId,
                list => list.remove(action.payload.taskId));
        },
        setTaskTitle: (state, action: PayloadAction<{ listId: string; taskId: string, title: string }>) => {
            return state?.updateList(action.payload.listId,
                list => list.updateTask(action.payload.taskId,
                    task => task.setTitle(action.payload.title)));
        },
        setTaskColor: (state, action: PayloadAction<{ listId: string; taskId: string, color: string }>) => {
            return state?.updateList(action.payload.listId,
                list => list.updateTask(action.payload.taskId,
                    task => task.setTitle(action.payload.color)));
        }
    }
});

export const { addList, deleteList, addTask, deleteTask, initTasks, setTaskTitle, setTaskColor } = tasksSlice.actions
export default tasksSlice.reducer;