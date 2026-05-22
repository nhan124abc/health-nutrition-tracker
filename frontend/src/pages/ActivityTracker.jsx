import { Alert, Badge, Card, Col, ListGroup, ProgressBar, Row } from 'react-bootstrap';

const workouts = [
  {
    id: 1,
    name: 'Chạy bộ',
    duration: '35 phút',
    caloriesBurned: 320,
  },
  {
    id: 2,
    name: 'Gym',
    duration: '50 phút',
    caloriesBurned: 410,
  },
  {
    id: 3,
    name: 'Đạp xe',
    duration: '25 phút',
    caloriesBurned: 180,
  },
  {
    id: 4,
    name: 'Đi bộ nhanh',
    duration: '20 phút',
    caloriesBurned: 95,
  },
];

const waterGoalMl = 2500;
const waterDrankMl = 1750;
const caloriesConsumed = 2180;
const calorieGoal = 2000;

function ActivityTracker() {
  const totalCaloriesBurned = workouts.reduce((total, workout) => total + workout.caloriesBurned, 0);
  const waterPercentage = Math.min(Math.round((waterDrankMl / waterGoalMl) * 100), 100);
  const isOverCalories = caloriesConsumed > calorieGoal;

  return (
    <>
      <div className="mb-4">
        <Badge bg="success" className="mb-2">
          Theo dõi vận động
        </Badge>
        <h1 className="h2 fw-bold mb-1">Theo dõi vận động</h1>
        <p className="text-secondary mb-0">
          Quản lý bài tập, lượng calo tiêu hao và tiến độ uống nước trong ngày.
        </p>
      </div>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 mb-3">
                <div>
                  <Card.Title className="fw-bold mb-1">Bài tập đã thực hiện</Card.Title>
                  <Card.Text className="text-secondary small mb-0">
                    Tổng calo đã đốt: <strong>{totalCaloriesBurned} kcal</strong>
                  </Card.Text>
                </div>
                <Badge bg="primary" className="align-self-start">
                  {workouts.length} bài tập
                </Badge>
              </div>

              <ListGroup className="activity-list">
                {workouts.map((workout) => (
                  <ListGroup.Item
                    key={workout.id}
                    className="d-flex flex-column flex-sm-row justify-content-between gap-2 align-items-sm-center"
                  >
                    <div>
                      <div className="fw-semibold">{workout.name}</div>
                      <div className="text-secondary small">{workout.duration}</div>
                    </div>
                    <div className="fw-bold text-success">{workout.caloriesBurned} kcal</div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Row className="g-4">
            <Col xs={12}>
              <Alert variant={isOverCalories ? 'warning' : 'info'} className="border-0 shadow-sm mb-0">
                <Alert.Heading className="h5">
                  {isOverCalories ? 'Cảnh báo calo' : 'Nhắc nhở uống nước'}
                </Alert.Heading>
                {isOverCalories ? (
                  <p className="mb-0">
                    Bạn đã nạp {caloriesConsumed} kcal, vượt mục tiêu {calorieGoal} kcal hôm nay.
                  </p>
                ) : (
                  <p className="mb-0">Bạn còn cần uống thêm nước để đạt mục tiêu trong ngày.</p>
                )}
              </Alert>
            </Col>

            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="fw-bold mb-1">Tiến độ uống nước</Card.Title>
                  <Card.Text className="text-secondary small mb-3">
                    Đã uống {waterDrankMl}ml / {waterGoalMl}ml
                  </Card.Text>
                  <ProgressBar now={waterPercentage} variant="info" label={`${waterPercentage}%`} />
                  <div className="d-flex justify-content-between text-secondary small mt-2">
                    <span>0ml</span>
                    <span>Mục tiêu {waterGoalMl}ml</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
}

export default ActivityTracker;
