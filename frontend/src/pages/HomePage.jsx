import { Badge, Button, Card, Col, Container, ProgressBar, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBarcode,
  FaChartLine,
  FaCheckCircle,
  FaDumbbell,
  FaHeartbeat,
  FaLock,
  FaTint,
  FaUserCheck,
  FaUtensils,
  FaWeight,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';

const featureCards = [
  { icon: FaUserCheck, titleKey: 'home.features.onboarding.title', descriptionKey: 'home.features.onboarding.description' },
  { icon: FaUtensils, titleKey: 'home.features.meals.title', descriptionKey: 'home.features.meals.description' },
  { icon: FaBarcode, titleKey: 'home.features.database.title', descriptionKey: 'home.features.database.description' },
  { icon: FaDumbbell, titleKey: 'home.features.activity.title', descriptionKey: 'home.features.activity.description' },
  { icon: FaWeight, titleKey: 'home.features.metrics.title', descriptionKey: 'home.features.metrics.description' },
  { icon: FaChartLine, titleKey: 'home.features.statistics.title', descriptionKey: 'home.features.statistics.description' },
];

const flowSteps = [
  ['01', 'home.flow.steps.auth.title', 'home.flow.steps.auth.description'],
  ['02', 'home.flow.steps.profile.title', 'home.flow.steps.profile.description'],
  ['03', 'home.flow.steps.log.title', 'home.flow.steps.log.description'],
  ['04', 'home.flow.steps.track.title', 'home.flow.steps.track.description'],
];

const heroMetrics = [
  ['1,680', 'kcal', 'home.snapshot.calories'],
  ['112g', '', 'health.protein'],
  ['65', 'home.units.minutes', 'home.snapshot.activeMinutes'],
  ['8', 'home.units.days', 'home.snapshot.streak'],
];

function HomePage() {
  const { t } = useTranslation();

  const handleBrandClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="home-page premium-home">
      <header className="home-header premium-home-header">
        <Container className="d-flex align-items-center justify-content-between gap-3">
          <Link to="/" className="home-brand premium-home-brand" onClick={handleBrandClick}>
            <img src="/img/Logo.jpg" alt={t('app.name')} />
            <span>{t('app.name')}</span>
          </Link>
          <nav className="home-nav d-none d-lg-flex">
            <a href="#features">{t('home.nav.features')}</a>
            <a href="#flow">{t('home.nav.flow')}</a>
            <a href="#security">{t('home.nav.security')}</a>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <LanguageSwitcher />
            <Button as={Link} to="/login" variant="outline-success">
              {t('home.actions.login')}
            </Button>
            <Button as={Link} to="/register" variant="success">
              {t('home.actions.register')}
            </Button>
          </div>
        </Container>
      </header>

      <main>
        <section className="premium-hero">
          <Container>
            <Row className="align-items-center g-5">
              <Col lg={6}>
                <Badge bg="success" className="premium-eyebrow mb-3">
                  {t('home.hero.badge')}
                </Badge>
                <h1>{t('app.name')}</h1>
                <p className="premium-hero-copy">{t('home.hero.description')}</p>
                <div className="premium-hero-actions">
                  <Button as={Link} to="/register" variant="success" size="lg">
                    {t('home.actions.start')}
                  </Button>
                </div>
                <div className="premium-hero-points">
                  <span>
                    <FaCheckCircle />
                    {t('nav.profile')}
                  </span>
                  <span>
                    <FaCheckCircle />
                    {t('health.dailyCalorieGoal')}
                  </span>
                  <span>
                    <FaCheckCircle />
                    {t('nav.nutrition')}
                  </span>
                </div>
              </Col>

              <Col lg={6}>
                <div className="premium-product-stage">
                  <div className="premium-product-card">
                    <div className="premium-product-top">
                      <div className="premium-product-goal">
                        <span>{t('home.snapshot.goal')}</span>
                        <strong>84%</strong>
                      </div>
                    </div>
                    <div className="premium-product-plate">
                      <div className="premium-plate-ring">
                        <FaUtensils />
                      </div>
                    </div>
                    <div className="premium-macro-panel">
                      <div>
                        <span>{t('health.carbs')}</span>
                        <strong>180g</strong>
                      </div>
                      <div>
                        <span>{t('health.protein')}</span>
                        <strong>112g</strong>
                      </div>
                      <div>
                        <span>{t('health.fat')}</span>
                        <strong>54g</strong>
                      </div>
                    </div>
                  </div>

                  <div className="premium-floating-card premium-floating-card-left">
                    <FaTint />
                    <div>
                      <span>{t('nav.water')}</span>
                      <strong>2.1L</strong>
                    </div>
                  </div>

                  <div className="premium-floating-card premium-floating-card-right">
                    <FaDumbbell />
                    <div>
                      <span>{t('health.caloriesOut')}</span>
                      <strong>520 kcal</strong>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="premium-metrics-band">
          <Container>
            <Row className="g-3">
              {heroMetrics.map(([value, unitKey, labelKey]) => (
                <Col sm={6} lg={3} key={labelKey}>
                  <div className="premium-metric-tile">
                    <strong>
                      {value}
                      {unitKey && <small> {unitKey.startsWith('home.') ? t(unitKey) : unitKey}</small>}
                    </strong>
                    <span>{t(labelKey)}</span>
                  </div>
                </Col>
              ))}
            </Row>
          </Container>
        </section>

        <section className="premium-section premium-split-section">
          <Container>
            <Row className="g-4 align-items-center">
              <Col lg={5}>
                <Badge bg="light" text="success" className="mb-3">
                  {t('home.features.badge')}
                </Badge>
                <h2>{t('home.features.title')}</h2>
                <p>{t('home.features.description')}</p>
              </Col>
              <Col lg={7}>
                <div className="premium-dashboard-preview">
                  <div className="premium-preview-header">
                    <span>{t('dashboard.title')}</span>
                    <strong>1,680 / 2,000 kcal</strong>
                  </div>
                  <ProgressBar now={84} variant="success" />
                  <Row className="g-3 mt-2">
                    {featureCards.slice(0, 3).map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <Col md={4} key={feature.titleKey}>
                          <div className="premium-mini-module">
                            <Icon />
                            <span>{t(feature.titleKey)}</span>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="premium-section premium-feature-grid" id="features">
          <Container>
            <div className="section-heading premium-centered-heading">
              <Badge bg="success" className="mb-2">
                {t('home.features.badge')}
              </Badge>
              <h2>{t('home.features.title')}</h2>
              <p>{t('home.features.description')}</p>
            </div>
            <Row className="g-4">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Col md={6} xl={4} key={feature.titleKey}>
                    <Card className="premium-feature-card h-100 border-0">
                      <Card.Body>
                        <div className="home-feature-icon">
                          <Icon />
                        </div>
                        <h2 className="h5 fw-bold">{t(feature.titleKey)}</h2>
                        <p className="text-secondary mb-0">{t(feature.descriptionKey)}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Container>
        </section>

        <section className="premium-section premium-flow" id="flow">
          <Container>
            <Row className="g-4 align-items-start">
              <Col lg={5}>
                <Badge bg="success" className="mb-3">
                  {t('home.flow.badge')}
                </Badge>
                <h2>{t('home.flow.title')}</h2>
                <p>{t('home.flow.description')}</p>
              </Col>
              <Col lg={7}>
                <div className="premium-flow-list">
                  {flowSteps.map(([number, titleKey, descriptionKey]) => (
                    <div className="premium-flow-item" key={number}>
                      <span>{number}</span>
                      <div>
                        <h3>{t(titleKey)}</h3>
                        <p>{t(descriptionKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="premium-section premium-security" id="security">
          <Container>
            <Row className="g-4">
              <Col lg={6}>
                <Card className="premium-info-card border-0 h-100">
                  <Card.Body>
                    <FaLock className="home-info-icon" />
                    <h2>{t('home.security.authTitle')}</h2>
                    <p>{t('home.security.authDescription')}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="premium-info-card border-0 h-100">
                  <Card.Body>
                    <FaHeartbeat className="home-info-icon" />
                    <h2>{t('home.security.apiTitle')}</h2>
                    <p>{t('home.security.apiDescription')}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="premium-final-cta">
          <Container>
            <div className="premium-cta-panel">
              <div>
                <h2>{t('home.cta.title')}</h2>
                <p>{t('home.cta.description')}</p>
              </div>
              <Button as={Link} to="/register" variant="success" size="lg">
                {t('home.actions.createAccount')}
              </Button>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
