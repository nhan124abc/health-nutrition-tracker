import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const initialProfile = {
  username: '',
  birthDate: '',
  gender: '',
  height: '',
  weight: '',
  activityLevel: '',
  healthGoal: '',
  targetWeight: '',
  dailyCalorieGoal: '',
  dailyWaterGoal: '',
  bio: '',
  timezone: 'Asia/Bangkok',
};

function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);

  const bmi = useMemo(() => {
    const height = Number(profile.height);
    const weight = Number(profile.weight);

    if (!height || !weight) {
      return null;
    }

    return (weight / ((height / 100) ** 2)).toFixed(1);
  }, [profile.height, profile.weight]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaved(true);
  };

  const fields = [
    ['username', 'profilePage.fields.username', 'text'],
    ['birthDate', 'profile.birthDate', 'date'],
    ['height', 'profile.height', 'number'],
    ['weight', 'profile.weight', 'number'],
    ['targetWeight', 'profilePage.fields.targetWeight', 'number'],
    ['dailyCalorieGoal', 'health.dailyCalorieGoal', 'number'],
    ['dailyWaterGoal', 'profilePage.fields.dailyWaterGoal', 'number'],
    ['timezone', 'common.timezone', 'text'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('profilePage.badge')}</Badge>
          <h1>{t('profilePage.title')}</h1>
          <p>{t('profilePage.description')}</p>
        </div>
      </div>

      {saved && <Alert variant="success">{t('profilePage.savedMessage')}</Alert>}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  {fields.map(([name, labelKey, type]) => (
                    <Col md={6} key={name}>
                      <Form.Group>
                        <Form.Label>{t(labelKey)}</Form.Label>
                        <Form.Control type={type} name={name} value={profile[name]} onChange={handleChange} />
                      </Form.Group>
                    </Col>
                  ))}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('profile.gender')}</Form.Label>
                      <Form.Select name="gender" value={profile.gender} onChange={handleChange}>
                        <option value="">{t('profilePage.selectGender')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('profile.activityLevel')}</Form.Label>
                      <Form.Select name="activityLevel" value={profile.activityLevel} onChange={handleChange}>
                        <option value="">{t('profile.selectActivity')}</option>
                        <option value="sedentary">{t('profile.sedentary')}</option>
                        <option value="light">{t('profile.light')}</option>
                        <option value="moderate">{t('profile.moderate')}</option>
                        <option value="active">{t('profile.active')}</option>
                        <option value="very_active">{t('profile.veryActive')}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>{t('profilePage.fields.healthGoal')}</Form.Label>
                      <Form.Select name="healthGoal" value={profile.healthGoal} onChange={handleChange}>
                        <option value="">{t('profilePage.selectGoal')}</option>
                        <option value="lose_weight">{t('profilePage.goals.loseWeight')}</option>
                        <option value="maintain">{t('profilePage.goals.maintain')}</option>
                        <option value="gain_muscle">{t('profilePage.goals.gainMuscle')}</option>
                        <option value="improve_health">{t('profilePage.goals.improveHealth')}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>{t('common.bio')}</Form.Label>
                      <Form.Control as="textarea" rows={3} name="bio" value={profile.bio} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col xs={12} className="d-flex justify-content-end">
                    <Button variant="success" type="submit">{t('profilePage.saveProfile')}</Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-panel">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('profilePage.currentAccount')}</Card.Title>
              <Alert variant="warning" className="small">
                {t('profilePage.backendNote')}
              </Alert>
              <div className="nutrition-detail-grid">
                <div><span>BMI</span><strong>{bmi || '-'}</strong></div>
                <div><span>{t('common.goal')}</span><strong>{profile.healthGoal ? t(`profilePage.goals.${profile.healthGoal}`) : '-'}</strong></div>
                <div><span>{t('common.calories')}</span><strong>{profile.dailyCalorieGoal || '-'} kcal</strong></div>
                <div><span>{t('common.water')}</span><strong>{profile.dailyWaterGoal || '-'} ml</strong></div>
                <div><span>{t('common.timezone')}</span><strong>{profile.timezone}</strong></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Profile;
