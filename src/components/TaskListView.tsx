import { useDispatch } from 'react-redux';
import { Button, Card, CardBody, CardHeader, Col, Row } from 'reactstrap';
import { addTask, deleteList } from '../state/reducer';
import { TaskList } from './../state/state';
import { TaskView } from './TaskView';

type TaskListViewProps = {
    taskList: TaskList;
}

export const TaskListView = (props: TaskListViewProps) => {
    const { taskList } = props;
    const dispatch = useDispatch();

    const doAdd = () => {
        dispatch(addTask({ listId: taskList.__instanceId }));
    };

    const doDelete = () => {
        dispatch(deleteList({ listId: taskList.__instanceId }));
    };

    return (
        <Card className='list'>
            <CardHeader>
                <Row className='align-items-center'>
                    <Col>
                        {taskList.title || 'List'}
                    </Col>
                    <Col xs='auto'>
                        <Button color='success' size='sm' className='me-1' onClick={doAdd}>
                            Add
                        </Button>

                        <Button color='danger' size='sm' outline onClick={doDelete}>
                            Delete
                        </Button>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                {Object.entries(taskList.tasks.raw).map(([key, value]) =>
                    <TaskView taskItem={value} taskList={taskList} key={key} />
                )}
            </CardBody>
        </Card>
    )
};