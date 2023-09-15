import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap';
import { deleteTask, setTaskTitle } from '../state/reducer';
import { TaskItem, TaskList } from './../state/state';

type TaskViewProps = {
    taskList: TaskList;
    taskItem: TaskItem;
}

export const TaskView = (props: TaskViewProps) => {
    const { taskItem, taskList } = props;
    
    const dispatch = useDispatch();
    const [editTitle, setEditTitle] = React.useState(taskList.title || '');

    React.useEffect(() => {
        setEditTitle(taskItem.title || '');
    }, [taskItem.title]);

    const doDelete = () => {
        dispatch(deleteTask({ listId: taskList.__instanceId, taskId: taskItem.__instanceId }));
    };

    const doSetTitle = () => {
        dispatch(setTaskTitle({ listId: taskList.__instanceId, taskId: taskItem.__instanceId, title: editTitle }));
    };

    return (
        <Card className='task'>
            <CardHeader>
                <Row className='align-items-center'>
                    <Col>
                        Task
                    </Col>
                    <Col xs='auto'>
                        <Button color='danger' size='sm' outline onClick={doDelete}>
                            Delete
                        </Button>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                <Input type='textarea' value={editTitle}
                    onChange={ev => setEditTitle(ev.target.value)}
                    onBlur={doSetTitle} />
            </CardBody>
        </Card>
    );
}
