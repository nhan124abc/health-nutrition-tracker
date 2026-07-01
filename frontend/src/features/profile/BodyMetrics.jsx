import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import BodyMetricChart from './components/BodyMetricChart';
import BodyMetricFormCard from './components/BodyMetricFormCard';
import ProfileMetrics from './components/ProfileMetrics';
import {
  createBodyMetric,
  deleteBodyMetric,
  getBodyMetrics,
  getProfile,
  updateBodyMetric,
  updateProfile,
} from './profileService';
import {
  bodyMetricFields,
  bodyMetricResultFields,
  emptyBodyMetric,
  extractBodyMetricFromApi,
  extractMetricRows,
  extractProfileFromApi,
  getApiErrorMessage,
  getLatestBodyMetric,
  getTodayDate,
  mapBodyMetricToApi,
  mapProfileFromApi,
} from './profileUtils';

function createEmptyMetricForm() {
  return {
    ...emptyBodyMetric,
    date: getTodayDate(),
  };
}

function calculateBodyMetricValues(metricForm = {}, profileData = {}) {
  const weight = Number(metricForm.weight);
  const height = Number(metricForm.height);
  const gender = profileData?.gender;
  const birthDate = profileData?.birthDate ? new Date(profileData.birthDate) : null;
  const age = birthDate && !Number.isNaN(birthDate.getTime())
    ? Math.floor((Date.now() - birthDate.getTime()) / 31557600000)
    : 0;

  if (!weight || !height || !age || !gender) {
    return null;
  }

  const bmi = weight / ((height / 100) ** 2);
  const genderOffset = gender === 'male' ? 5 : -161;
  const bmr = 9.99 * weight + 6.25 * height - 4.92 * age + genderOffset;
  const sex = gender === 'male' ? 1 : 0;
  const bodyFat = 1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4;

  return {
    bmi: bmi.toFixed(1),
    bmr: String(Math.round(bmr)),
    bodyFat: Math.max(0, bodyFat).toFixed(1),
  };
}

function applyCalculatedMetricValues(currentForm, profileData) {
  const calculated = calculateBodyMetricValues(currentForm, profileData);
  const nextValues = calculated || { bmi: '', bmr: '', bodyFat: '' };

  if (
    String(currentForm.bmi || '') === String(nextValues.bmi || '') &&
    String(currentForm.bmr || '') === String(nextValues.bmr || '') &&
    String(currentForm.bodyFat || '') === String(nextValues.bodyFat || '')
  ) {
    return currentForm;
  }

  return {
    ...currentForm,
    ...nextValues,
  };
}

function BodyMetrics() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState(createEmptyMetricForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [editForm, setEditForm] = useState(emptyBodyMetric);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      setLoading(true);
      setError('');

      try {
        const [profileResult, metricsResult] = await Promise.allSettled([
          getProfile(),
          getBodyMetrics({ page: 0, size: 100 }),
        ]);

        if (!isMounted) {
          return;
        }

        const loadedProfile = profileResult.status === 'fulfilled'
          ? mapProfileFromApi(extractProfileFromApi(profileResult.value.data))
          : {};
        const loadedMetrics = metricsResult.status === 'fulfilled'
          ? extractMetricRows(metricsResult.value.data)
          : [];

        setProfile(loadedProfile);
        setMetrics(loadedMetrics);
        setForm(createEmptyMetricForm());

        const failedResult = [profileResult, metricsResult].find((result) => result.status === 'rejected');
        if (failedResult) {
          setError(getApiErrorMessage(failedResult.reason, t('bodyMetricsPage.loadError')));
        }
      } catch (requestError) {
        console.error('[BodyMetrics] Error loading metrics:', requestError);

        if (isMounted) {
          setMetrics([]);
          setError(getApiErrorMessage(requestError, t('bodyMetricsPage.loadError')));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    setForm((current) => applyCalculatedMetricValues(current, profile));
  }, [form.weight, form.height, profile]);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!editingMetric) {
      return;
    }

    setEditForm((current) => applyCalculatedMetricValues(current, profile));
  }, [editForm.weight, editForm.height, editingMetric, profile]);

  const syncProfileWeight = (nextMetrics) => {
    const latestMetric = getLatestBodyMetric(nextMetrics);
    const nextWeight = latestMetric.weightKg ?? latestMetric.weight;

    if (Number(nextWeight) > 0) {
      const nextProfile = { ...(profile || {}), weight: nextWeight };
      setProfile(nextProfile);
      updateProfile({ weightKg: Number(nextWeight) })
        .then(() => window.dispatchEvent(new CustomEvent('profile:updated', { detail: nextProfile })))
        .catch((syncError) => {
          console.error('[BodyMetrics] Error syncing profile weight:', syncError);
        });
    }
  };

  const mapMetricToForm = (metric = {}) => ({
    ...emptyBodyMetric,
    date: String(metric.recordedAt || metric.date || getTodayDate()).slice(0, 10),
    weight: metric.weightKg ?? metric.weight ?? '',
    height: metric.heightCm ?? metric.height ?? profile?.height ?? '',
    bodyFat: metric.bodyFatPercentage ?? metric.bodyFat ?? '',
    bmi: metric.bmi ?? '',
    bmr: metric.bmr ?? '',
    waist: metric.waistCm ?? metric.waist ?? '',
    hip: metric.hipCm ?? metric.hip ?? '',
    chest: metric.chestCm ?? metric.chest ?? '',
  });

  const openEditMetric = (metric) => {
    setEditingMetric(metric);
    setEditForm(mapMetricToForm(metric));
  };

  const closeEditMetric = () => {
    if (updating) {
      return;
    }

    setEditingMetric(null);
    setEditForm(emptyBodyMetric);
  };

  const addMetric = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const response = await createBodyMetric(mapBodyMetricToApi(form));
      const createdMetric = extractBodyMetricFromApi(response.data);
      const nextMetrics = [
        createdMetric,
        ...metrics.filter((item) => item.id !== createdMetric.id),
      ];
      const nextProfile = {
        ...(profile || {}),
        weight: form.weight,
        height: form.height,
      };

      setMetrics(nextMetrics);
      setProfile(nextProfile);
      setForm(createEmptyMetricForm());

      if (Number(form.weight) > 0 || Number(form.height) > 0) {
        updateProfile({
          ...(Number(form.weight) > 0 ? { weightKg: Number(form.weight) } : {}),
          ...(Number(form.height) > 0 ? { heightCm: Number(form.height) } : {}),
        })
          .then(() => window.dispatchEvent(new CustomEvent('profile:updated', { detail: nextProfile })))
          .catch((syncError) => {
            console.error('[BodyMetrics] Error syncing profile weight:', syncError);
          });
      }

      setSaved(true);
    } catch (requestError) {
      console.error('[BodyMetrics] Error saving metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const updateMetric = async (event) => {
    event.preventDefault();

    if (!editingMetric || updating) {
      return;
    }

    setUpdating(true);
    setSaved(false);
    setError('');

    try {
      const response = await updateBodyMetric(editingMetric.id, mapBodyMetricToApi(editForm));
      const updatedMetric = extractBodyMetricFromApi(response.data);
      const nextMetrics = metrics.map((item) => (
        item.id === editingMetric.id ? { ...item, ...updatedMetric } : item
      ));

      setMetrics(nextMetrics);
      setForm(createEmptyMetricForm());
      syncProfileWeight(nextMetrics);
      setEditingMetric(null);
      setEditForm(emptyBodyMetric);
      setSaved(true);
    } catch (requestError) {
      console.error('[BodyMetrics] Error updating metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.updateError')));
    } finally {
      setUpdating(false);
    }
  };

  const removeMetric = async (metric) => {
    if (!window.confirm(t('bodyMetricsPage.confirmDeleteMetric'))) {
      return;
    }

    setSaved(false);
    setError('');

    try {
      await deleteBodyMetric(metric.id);
      const nextMetrics = metrics.filter((item) => item.id !== metric.id);

      setMetrics(nextMetrics);
      setForm(createEmptyMetricForm());
      syncProfileWeight(nextMetrics);
      setSaved(true);
    } catch (requestError) {
      console.error('[BodyMetrics] Error deleting metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.deleteError')));
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('bodyMetricsPage.title')}</h1>
        </div>
      </div>

      <ErrorModal error={error} onClose={() => setError('')} />
      {saved && <Alert variant="success">{t('bodyMetricsPage.savedMessage')}</Alert>}

      {loading ? (
        <div className="py-5 text-center text-secondary">
          <Spinner animation="border" variant="success" className="mb-3" />
          <div>{t('bodyMetricsPage.loading')}</div>
        </div>
      ) : (
        <Row className="g-4">
          <Col lg={5}>
            <BodyMetricFormCard
              form={form}
              onChange={handleChange}
              onSubmit={addMetric}
              saving={saving}
              t={t}
            />
          </Col>
          <Col lg={7}>
            <BodyMetricChart metrics={metrics} t={t} />
          </Col>
          <Col xs={12}>
            <ProfileMetrics
              metrics={metrics}
              onDelete={removeMetric}
              onEdit={openEditMetric}
              t={t}
              titleKey="bodyMetricsPage.historyTitle"
            />
          </Col>
        </Row>
      )}

      <Modal show={Boolean(editingMetric)} onHide={closeEditMetric} centered>
        <Form onSubmit={updateMetric}>
          <Modal.Header closeButton>
            <Modal.Title>{t('bodyMetricsPage.editTitle')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              {bodyMetricFields.map(([name, labelKey, type]) => (
                <Col md={name === 'date' ? 12 : 6} key={name}>
                  <Form.Group>
                    <Form.Label>{t(labelKey)}</Form.Label>
                    <Form.Control
                      type={type}
                      name={name}
                      value={editForm[name]}
                      onChange={handleEditChange}
                      disabled={updating}
                      required={name === 'date'}
                    />
                  </Form.Group>
                </Col>
              ))}
              <Col xs={12}>
                <div className="body-metric-result-panel">
                  <div className="body-metric-result-header">
                    <span>{t('bodyMetricsPage.results.title')}</span>
                  </div>
                  <Row className="g-2">
                    {bodyMetricResultFields.map(([name, labelKey, type, unit]) => (
                      <Col sm={4} key={name}>
                        <Form.Group className="body-metric-result-tile">
                          <Form.Label>{t(labelKey)}</Form.Label>
                          <Form.Control
                            type={type}
                            name={name}
                            value={editForm[name]}
                            onChange={handleEditChange}
                            disabled={updating}
                            min="0"
                            step="0.1"
                            placeholder="--"
                          />
                          <Form.Text>{unit}</Form.Text>
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeEditMetric} disabled={updating}>
              {t('common.cancel')}
            </Button>
            <Button variant="success" type="submit" disabled={updating}>
              {updating ? t('bodyMetricsPage.updating') : t('common.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default BodyMetrics;
