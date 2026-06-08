import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell, FaEdit, FaHistory, FaIdCard, FaPrint } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import { getBodyMetrics, getProfile, updateProfile } from './profileService';

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

const sampleMetrics = [
  { id: 1, recordedAt: '2026-05-01', weightKg: 68.2, bodyFatPercentage: 22.1, muscleMassKg: 31.2, bmi: 23.1, waistCm: 82, hipCm: 96, chestCm: 91, notes: 'Start of month' },
  { id: 2, recordedAt: '2026-05-10', weightKg: 67.8, bodyFatPercentage: 21.8, muscleMassKg: 31.4, bmi: 22.9, waistCm: 81, hipCm: 96, chestCm: 91, notes: '' },
  { id: 3, recordedAt: '2026-05-21', weightKg: 67.4, bodyFatPercentage: 21.2, muscleMassKg: 31.7, bmi: 22.8, waistCm: 80, hipCm: 95, chestCm: 92, notes: 'After three weeks' },
];

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

function extractMetricRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.content || data?.data || data?.items || [];
}

function Profile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(initialProfile);
  const [account, setAccount] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    mealReminder: true,
    waterReminder: true,
    weightReminder: false,
    weeklyReport: true,
  });
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
        const [profileResponse, metricsResponse] = await Promise.allSettled([
          getProfile(),
          getBodyMetrics({ page: 0, size: 20 }),
        ]);

        if (!isMounted) {
          return;
        }

        if (profileResponse.status === 'fulfilled') {
          setProfile(mapProfileFromApi(profileResponse.value.data));
        } else {
          setError(getApiErrorMessage(profileResponse.reason, t('profilePage.loadError')));
        }

        if (metricsResponse.status === 'fulfilled') {
          const rows = extractMetricRows(metricsResponse.value.data);
          setMetrics(rows.length > 0 ? rows : sampleMetrics);
        } else {
          setMetrics(sampleMetrics);
        }

        setAccount(getCurrentUser());
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

  const handleNotificationChange = (event) => {
    const { checked, name } = event.target;
    setNotificationSettings((current) => ({ ...current, [name]: checked }));
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

  const printProfile = () => {
    window.print();
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

  const summaryItems = [
    ['BMI', bmi || '-'],
    [t('common.goal'), profile.healthGoal ? t(`profilePage.goals.${profile.healthGoal}`) : '-'],
    [t('common.calories'), profile.dailyCalorieGoal ? `${profile.dailyCalorieGoal} kcal` : '-'],
    [t('common.water'), profile.dailyWaterGoal ? `${profile.dailyWaterGoal} ml` : '-'],
    [t('common.timezone'), profile.timezone || '-'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('profilePage.badge')}</Badge>
          <h1>{t('profilePage.title')}</h1>
          <p>{t('profilePage.description')}</p>
        </div>
        <Button variant="outline-success" onClick={printProfile}>
          <FaPrint className="me-2" />
          {t('profilePage.printProfile')}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">{t('profilePage.savedMessage')}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="py-2">
          <Nav variant="pills" activeKey={activeTab} onSelect={(key) => setActiveTab(key || 'overview')} className="gap-2 profile-tab-nav">
            <Nav.Item><Nav.Link eventKey="overview"><FaIdCard className="me-2" />{t('profilePage.tabs.overview')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="edit"><FaEdit className="me-2" />{t('profilePage.tabs.edit')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="metrics"><FaHistory className="me-2" />{t('profilePage.tabs.metrics')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="notifications"><FaBell className="me-2" />{t('profilePage.tabs.notifications')}</Nav.Link></Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {loading ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="py-5 text-center text-secondary">
            <Spinner animation="border" variant="success" className="mb-3" />
            <div>{t('profilePage.loading')}</div>
          </Card.Body>
        </Card>
      ) : (
        <>
          {activeTab === 'overview' && (
            <Row className="g-4">
              <Col lg={8}>
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <Card.Title className="fw-bold mb-3">{t('profilePage.healthProfile')}</Card.Title>
                    <div className="nutrition-detail-grid">
                      <div><span>{t('profilePage.fields.username')}</span><strong>{profile.username || '-'}</strong></div>
                      <div><span>{t('profile.gender')}</span><strong>{profile.gender ? t(`profile.${profile.gender}`) : '-'}</strong></div>
                      <div><span>{t('profile.activityLevel')}</span><strong>{profile.activityLevel ? t(`profile.${profile.activityLevel === 'very_active' ? 'veryActive' : profile.activityLevel}`) : '-'}</strong></div>
                      <div><span>{t('profile.height')}</span><strong>{profile.height || '-'} cm</strong></div>
                      <div><span>{t('profile.weight')}</span><strong>{profile.weight || '-'} kg</strong></div>
                      <div><span>{t('common.bio')}</span><strong>{profile.bio || '-'}</strong></div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <Card.Title className="fw-bold mb-3">{t('profilePage.currentAccount')}</Card.Title>
                    {account?.email && <p className="text-secondary mb-3">{account.email}</p>}
                    <div className="nutrition-detail-grid">
                      {summaryItems.map(([label, value]) => (
                        <div key={label}><span>{label}</span><strong>{value}</strong></div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {activeTab === 'edit' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Card.Title className="fw-bold mb-3">{t('profilePage.updateProfile')}</Card.Title>
                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    {fields.map(([name, labelKey, type]) => (
                      <Col md={6} key={name}>
                        <Form.Group>
                          <Form.Label>{t(labelKey)}</Form.Label>
                          <Form.Control type={type} name={name} value={profile[name]} onChange={handleChange} disabled={saving} />
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
              </Card.Body>
            </Card>
          )}

          {activeTab === 'metrics' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <Card.Title className="fw-bold mb-3">{t('profilePage.metricHistory')}</Card.Title>
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th className="text-end">{t('common.weight')}</th>
                        <th className="text-end">BMI</th>
                        <th className="text-end">{t('bodyMetricsPage.table.bodyFat')}</th>
                        <th className="text-end">{t('bodyMetricsPage.table.muscle')}</th>
                        <th className="text-end">{t('bodyMetricsPage.table.measurements')}</th>
                        <th>{t('common.notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((item) => (
                        <tr key={item.id}>
                          <td>{String(item.recordedAt || item.date).slice(0, 10)}</td>
                          <td className="text-end">{item.weightKg ?? item.weight ?? '-'}kg</td>
                          <td className="text-end">{item.bmi ?? '-'}</td>
                          <td className="text-end">{item.bodyFatPercentage ?? item.bodyFat ?? '-'}%</td>
                          <td className="text-end">{item.muscleMassKg ?? item.muscleMass ?? '-'}kg</td>
                          <td className="text-end">{item.waistCm ?? item.waist ?? '-'}/{item.hipCm ?? item.hip ?? '-'}/{item.chestCm ?? item.chest ?? '-'}cm</td>
                          <td>{item.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Card.Title className="fw-bold mb-3">{t('profilePage.notificationSettings')}</Card.Title>
                <Row className="g-3">
                  {[
                    ['mealReminder', 'profilePage.notifications.mealReminder'],
                    ['waterReminder', 'profilePage.notifications.waterReminder'],
                    ['weightReminder', 'profilePage.notifications.weightReminder'],
                    ['weeklyReport', 'profilePage.notifications.weeklyReport'],
                  ].map(([name, labelKey]) => (
                    <Col md={6} key={name}>
                      <Form.Check
                        type="switch"
                        id={`notification-${name}`}
                        name={name}
                        label={t(labelKey)}
                        checked={notificationSettings[name]}
                        onChange={handleNotificationChange}
                      />
                    </Col>
                  ))}
                </Row>
                <Alert variant="light" className="border mt-4 mb-0">{t('profilePage.notifications.localOnly')}</Alert>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </>
  );
}

export default Profile;
