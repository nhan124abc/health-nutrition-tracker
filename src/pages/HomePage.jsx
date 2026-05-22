import { Badge, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBarcode,
  FaChartLine,
  FaDumbbell,
  FaHeartbeat,
  FaLock,
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
  { icon: FaChartLine, titleKey: 'home.features.analytics.title', descriptionKey: 'home.features.analytics.description' },
];

const flowSteps = [
  ['1', 'home.flow.steps.auth.title', 'home.flow.steps.auth.description'],
  ['2', 'home.flow.steps.profile.title', 'home.flow.steps.profile.description'],
  ['3', 'home.flow.steps.log.title', 'home.flow.steps.log.description'],
  ['4', 'home.flow.steps.track.title', 'home.flow.steps.track.description'],
];

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="home-page">
      <header className="home-header">
        <Container className="d-flex align-items-center justify-content-between gap-3">
          <Link to="/" className="home-brand">
            <FaHeartbeat />
            <span>{t('app.name')}</span>
          </Link>
          <nav className="home-nav d-none d-lg-flex">
            <a href="#features">{t('home.nav.features')}</a>
            <a href="#flow">{t('home.nav.flow')}</a>
            <a href="#security">{t('home.nav.security')}</a>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <LanguageSwitcher />
            <Button as={Link} to="/login" variant="outline-success">{t('home.actions.login')}</Button>
            <Button as={Link} to="/register" variant="success">{t('home.actions.register')}</Button>
          </div>
        </Container>
      </header>

      <main>
        <section className="home-hero product-hero">
          <Container>
            <Row className="align-items-center g-5">
              <Col lg={7}>
                <Badge bg="success" className="mb-3">{t('home.hero.badge')}</Badge>
                <h1>{t('app.name')}</h1>
                <p className="home-hero-text">{t('home.hero.description')}</p>
                <p className="home-hero-text home-hero-text-secondary">{t('home.hero.secondary')}</p>
                <div className="d-flex flex-wrap gap-3">
                  <Button as={Link} to="/register" variant="success" size="lg">{t('home.actions.start')}</Button>
                  <Button as={Link} to="/login" variant="outline-success" size="lg">{t('home.actions.login')}</Button>
                </div>
              </Col>
              <Col lg={5}>
                <div className="hero-snapshot">
                  <div className="hero-snapshot-main">
                    <span>{t('home.snapshot.calories')}</span>
                    <strong>1,680 / 2,000 kcal</strong>
                    <small>{t('home.snapshot.goal')}</small>
                  </div>
                  <div>
                    <span>{t('health.protein')}</span>
                    <strong>112g</strong>
                  </div>
                  <div>
                    <span>{t('home.snapshot.activeMinutes')}</span>
                    <strong>65 {t('home.units.minutes')}</strong>
                  </div>
                  <div>
                    <span>{t('home.snapshot.streak')}</span>
                    <strong>8 {t('home.units.days')}</strong>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="home-features" id="features">
          <Container>
            <div className="section-heading">
              <Badge bg="light" text="success" className="mb-2">{t('home.features.badge')}</Badge>
              <h2>{t('home.features.title')}</h2>
              <p>{t('home.features.description')}</p>
            </div>
            <Row className="g-4">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Col md={6} xl={4} key={feature.titleKey}>
                    <Card className="home-feature-card h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="home-feature-icon"><Icon /></div>
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

        <section className="home-flow" id="flow">
          <Container>
            <Row className="g-4 align-items-start">
              <Col lg={5}>
                <Badge bg="success" className="mb-3">{t('home.flow.badge')}</Badge>
                <h2>{t('home.flow.title')}</h2>
                <p>{t('home.flow.description')}</p>
              </Col>
              <Col lg={7}>
                <div className="flow-list">
                  {flowSteps.map(([number, titleKey, descriptionKey]) => (
                    <div className="flow-item" key={number}>
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

        <section className="home-security" id="security">
          <Container>
            <Row className="g-4">
              <Col lg={6}>
                <Card className="home-info-card border-0 shadow-sm h-100">
                  <Card.Body>
                    <FaLock className="home-info-icon" />
                    <h2>{t('home.security.authTitle')}</h2>
                    <p>{t('home.security.authDescription')}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="home-info-card border-0 shadow-sm h-100">
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

        <section className="home-final-cta">
          <Container className="text-center">
            <h2>{t('home.cta.title')}</h2>
            <p>{t('home.cta.description')}</p>
            <Button as={Link} to="/register" variant="success" size="lg">
              {t('home.actions.createAccount')}
            </Button>
          </Container>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
