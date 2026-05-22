import { Button, Card, Col, Row, Table } from 'react-bootstrap';

const weeklyData = [
  { date: 'Thứ 2', calories: 1890, water: '2.1L', workout: '35 phút' },
  { date: 'Thứ 3', calories: 2050, water: '1.8L', workout: '20 phút' },
  { date: 'Thứ 4', calories: 1760, water: '2.4L', workout: 'Nghỉ' },
  { date: 'Thứ 5', calories: 1985, water: '2.0L', workout: '45 phút' },
];

function Reports() {
  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h2 fw-bold mb-1">Báo cáo</h1>
          <p className="text-secondary mb-0">Tổng hợp dữ liệu dinh dưỡng và vận động theo tuần.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-success">Xuất Excel</Button>
          <Button variant="success">Xuất PDF</Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold">Tóm tắt tuần</Card.Title>
              <div className="mt-4 report-summary">
                <div>
                  <span>Calo trung bình</span>
                  <strong>1,921 kcal</strong>
                </div>
                <div>
                  <span>Nước trung bình</span>
                  <strong>2.1L</strong>
                </div>
                <div>
                  <span>Số buổi vận động</span>
                  <strong>3 buổi</strong>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold">Dữ liệu chi tiết</Card.Title>
              <div className="table-responsive mt-3">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th className="text-end">Calo</th>
                      <th className="text-end">Nước</th>
                      <th className="text-end">Vận động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((item) => (
                      <tr key={item.date}>
                        <td>{item.date}</td>
                        <td className="text-end">{item.calories}</td>
                        <td className="text-end">{item.water}</td>
                        <td className="text-end">{item.workout}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Reports;
