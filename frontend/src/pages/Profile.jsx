import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '../api/api';
import { getProfile, updateProfile } from '../features/profile/profileService';

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

const activityFromApi = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'light',
  MODERATELY_ACTIVE: 'moderate',
  VERY_ACTIVE: 'active',
  EXTRA_ACTIVE: 'very_active',
};

const activityToApi = {
  sedentary: 'SEDENTARY',
  light: 'LIGHTLY_ACTIVE',
  moderate: 'MODERATELY_ACTIVE',
  active: 'VERY_ACTIVE',
  very_active: 'EXTRA_ACTIVE',
};

const goalFromApi = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN_WEIGHT: 'maintain',
  GAIN_MUSCLE: 'gain_muscle',
  IMPROVE_FITNESS: 'improve_health',
};

const goalToApi = {
  lose_weight: 'LOSE_WEIGHT',
  maintain: 'MAINTAIN_WEIGHT',
  gain_muscle: 'GAIN_MUSCLE',
  improve_health: 'IMPROVE_FITNESS',
};

function emptyToNull(value) {
  return value === '' ? null : value;
}

function normalizeNumber(value) {
  return value === '' ? null : Number(value);
}

function mapProfileFromApi(data = {}) {
  return {
    username: data.username || '',
    birthDate: data.dateOfBirth || '',
    gender: data.gender?.toLowerCase() || '',
    height: data.heightCm ?? '',
    weight: data.weightKg ?? '',
    activityLevel: activityFromApi[data.activityLevel] || '',
    healthGoal: goalFromApi[data.goal] || '',
    targetWeight: data.targetWeightKg ?? '',
    dailyCalorieGoal: data.dailyCalorieGoal ?? '',
    dailyWaterGoal: data.dailyWaterGoalMl ?? '',
    bio: data.bio || '',
    timezone: data.timezone || initialProfile.timezone,
  };
}

function mapProfileToApi(profile) {
  return {
    username: emptyToNull(profile.username),
    dateOfBirth: emptyToNull(profile.birthDate),
    gender: profile.gender ? profile.gender.toUpperCase() : null,
    heightCm: normalizeNumber(profile.height),
    weightKg: normalizeNumber(profile.weight),
    activityLevel: activityToApi[profile.activityLevel] || null,
    goal: goalToApi[profile.healthGoal] || null,
    targetWeightKg: normalizeNumber(profile.targetWeight),
    dailyCalorieGoal: normalizeNumber(profile.dailyCalorieGoal),
    dailyWaterGoalMl: normalizeNumber(profile.dailyWaterGoal),
    bio: profile.bio,
    timezone: emptyToNull(profile.timezone),
  };
}

function getApiErrorMessage(err, fallback) {
  const errors = err.response?.data?.errors;

  if (errors) {
    return Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');
  }

  return err.response?.data?.message || fallback;
}

function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const response = await getProfile();

        if (!isMounted) {
          return;
        }

        setProfile(mapProfileFromApi(response.data));
        setAccount(getCurrentUser());
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, t('profilePage.loadError')));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [t]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setError('');
    setSaving(true);

    try {
      const response = await updateProfile(mapProfileToApi(profile));
      setProfile(mapProfileFromApi(response.data));
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('profilePage.saveError')));
    } finally {
      setSaving(false);
    }
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

      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">{t('profilePage.savedMessage')}</Alert>}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {loading ? (
                <div className="py-5 text-center text-secondary">
                  <Spinner animation="border" variant="success" className="mb-3" />
                  <div>{t('profilePage.loading')}</div>
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    {fields.map(([name, labelKey, type]) => (
                      <Col md={6} key={name}>
                        <Form.Group>
                          <Form.Label>{t(labelKey)}</Form.Label>
                          <Form.Control
                            type={type}
                            name={name}
                            value={profile[name]}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </Form.Group>
                      </Col>
                    ))}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>{t('profile.gender')}</Form.Label>
                        <Form.Select name="gender" value={profile.gender} onChange={handleChange} disabled={saving}>
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
                        <Form.Select name="activityLevel" value={profile.activityLevel} onChange={handleChange} disabled={saving}>
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
                        <Form.Select name="healthGoal" value={profile.healthGoal} onChange={handleChange} disabled={saving}>
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
                        <Form.Control as="textarea" rows={3} name="bio" value={profile.bio} onChange={handleChange} disabled={saving} />
                      </Form.Group>
                    </Col>
                    <Col xs={12} className="d-flex justify-content-end">
                      <Button variant="success" type="submit" disabled={saving}>
                        {saving ? t('profilePage.saving') : t('profilePage.saveProfile')}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-panel">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('profilePage.currentAccount')}</Card.Title>
              {account?.email && <p className="text-secondary mb-3">{account.email}</p>}
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
