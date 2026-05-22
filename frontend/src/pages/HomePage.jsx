import { Badge, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaAppleAlt,
  FaCalendarAlt,
  FaChartPie,
  FaCheckCircle,
  FaLeaf,
  FaShoppingBasket,
  FaUtensils,
} from 'react-icons/fa';

const dietOptions = ['Anything', 'Keto', 'Mediterranean', 'Vegan', 'Vegetarian'];

const benefits = [
  {
    icon: FaLeaf,
    title: 'Cá nhân hóa theo lối ăn',
    description: 'Chọn chế độ ăn yêu thích, mục tiêu calo và số bữa để tạo kế hoạch phù hợp với bạn.',
  },
  {
    icon: FaCalendarAlt,
    title: 'Lên kế hoạch cả ngày',
    description: 'Theo dõi bữa sáng, trưa, tối và bữa phụ trong một giao diện rõ ràng.',
  },
  {
    icon: FaShoppingBasket,
    title: 'Chuẩn bị nguyên liệu dễ hơn',
    description: 'Biết trước hôm nay cần ăn gì để mua sắm và chuẩn bị thực phẩm chủ động hơn.',
  },
  {
    icon: FaChartPie,
    title: 'Bám sát macro',
    description: 'Theo dõi calo, carbs, fat và protein để giữ tiến độ dinh dưỡng mỗi ngày.',
  },
];

const sampleMeals = [
  { meal: 'Breakfast', food: 'Greek yogurt bowl', calories: 420 },
  { meal: 'Lunch', food: 'Chicken rice plate', calories: 610 },
  { meal: 'Dinner', food: 'Salmon and vegetables', calories: 540 },
];

function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <Container className="d-flex align-items-center justify-content-between gap-3">
          <Link to="/" className="home-brand">
            <img src="/logo192.png" alt="Health Nutrition" />
            <span>Health Nutrition</span>
          </Link>

          <nav className="home-nav d-none d-md-flex">
            <a href="#planner">Meal Planner</a>
            <a href="#features">Tính năng</a>
            <a href="#reviews">Đánh giá</a>
          </nav>

          <div className="d-flex gap-2">
            <Button as={Link} to="/login" variant="outline-success">
              Đăng nhập
            </Button>
            <Button as={Link} to="/register" variant="success">
              Đăng ký
            </Button>
          </div>
        </Container>
      </header>

      <main>
        <section className="home-hero">
          <Container>
            <Row className="align-items-center g-5">
              <Col lg={6}>
                <Badge bg="success" className="mb-3">
                  Automatic Meal Planner
                </Badge>
                <h1>Đưa chế độ ăn của bạn vào chế độ tự động.</h1>
                <p className="home-hero-text">
                  Health Nutrition giúp tạo kế hoạch ăn uống cá nhân hóa theo mục tiêu calo, sở thích ăn uống
                  và lịch sinh hoạt. Theo dõi bữa ăn, nước uống, vận động và macro trong một nơi duy nhất.
                </p>
                <div className="d-flex flex-wrap gap-3">
                  <Button as={Link} to="/register" variant="success" size="lg">
                    Tạo kế hoạch miễn phí
                  </Button>
                  <Button as={Link} to="/login" variant="outline-success" size="lg">
                    Đăng nhập
                  </Button>
                </div>
              </Col>

              <Col lg={6}>
                <Card className="home-planner-card border-0 shadow-lg" id="planner">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span className="home-planner-icon">
                        <FaUtensils />
                      </span>
                      <div>
                        <Card.Title className="h4 fw-bold mb-0">Tạo meal plan trong vài giây</Card.Title>
                        <Card.Text className="text-secondary small mb-0">
                          Chọn mục tiêu và xem lịch ăn mẫu trong ngày.
                        </Card.Text>
                      </div>
                    </div>

                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Preferred diet</Form.Label>
                        <div className="home-diet-options">
                          {dietOptions.map((option) => (
                            <button type="button" className={option === 'Anything' ? 'active' : ''} key={option}>
                              {option}
                            </button>
                          ))}
                        </div>
                      </Form.Group>

                      <Row className="g-3">
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label>I want to eat</Form.Label>
                            <Form.Control type="number" defaultValue="2000" />
                          </Form.Group>
                        </Col>
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label>Meals per day</Form.Label>
                            <Form.Select defaultValue="4">
                              <option value="3">3 meals</option>
                              <option value="4">4 meals</option>
                              <option value="5">5 meals</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="home-macro-targets">
                        <span>90g Carbs</span>
                        <span>60g Fat</span>
                        <span>120g Protein</span>
                      </div>

                      <Button as={Link} to="/register" variant="success" className="w-100 mt-3">
                        Generate plan
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="home-meal-preview">
          <Container>
            <Row className="g-4 align-items-center">
              <Col lg={5}>
                <h2>Ăn uống thông minh chưa bao giờ dễ hơn.</h2>
                <p>
                  Lập kế hoạch trước giúp bạn giảm bối rối khi chọn món, kiểm soát macro và duy trì thói quen
                  lành mạnh dài hạn.
                </p>
              </Col>
              <Col lg={7}>
                <Card className="border-0 shadow-sm home-sample-plan">
                  <Card.Body>
                    {sampleMeals.map((item) => (
                      <div className="home-sample-row" key={item.meal}>
                        <div>
                          <strong>{item.meal}</strong>
                          <span>{item.food}</span>
                        </div>
                        <Badge bg="success">{item.calories} kcal</Badge>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="home-features" id="features">
          <Container>
            <div className="text-center mb-4">
              <Badge bg="light" text="success" className="mb-2">
                Features
              </Badge>
              <h2 className="fw-bold">Mọi thứ bạn cần để theo dõi dinh dưỡng</h2>
            </div>
            <Row className="g-4">
              {benefits.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Col md={6} lg={3} key={feature.title}>
                    <Card className="home-feature-card h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="home-feature-icon">
                          <Icon />
                        </div>
                        <h3 className="h5 fw-bold">{feature.title}</h3>
                        <p className="text-secondary mb-0">{feature.description}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Container>
        </section>

        <section className="home-proof" id="reviews">
          <Container>
            <Row className="g-4">
              {[
                ['4.8/5', 'Điểm hài lòng từ người dùng thử nghiệm'],
                ['2,000+', 'Mẫu bữa ăn có thể mở rộng'],
                ['7 ngày', 'Theo dõi kế hoạch ăn uống theo tuần'],
              ].map(([value, label]) => (
                <Col md={4} key={value}>
                  <Card className="border-0 shadow-sm home-proof-card">
                    <Card.Body>
                      <FaCheckCircle className="text-success mb-3" />
                      <div className="home-proof-value">{value}</div>
                      <p className="text-secondary mb-0">{label}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Container>
        </section>

        <section className="home-final-cta">
          <Container className="text-center">
            <FaAppleAlt className="home-final-icon" />
            <h2>Hôm nay bạn ăn gì?</h2>
            <p>Tạo tài khoản để bắt đầu xây dựng kế hoạch ăn uống và theo dõi sức khỏe của bạn.</p>
            <Button as={Link} to="/register" variant="success" size="lg">
              Bắt đầu miễn phí
            </Button>
          </Container>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
