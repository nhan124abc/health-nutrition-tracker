import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
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
  buildBodyMetricFormFromProfile,
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

function BodyMetrics() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState(() => ({ ...emptyBodyMetric, date: getTodayDate() }));
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
        setForm(buildBodyMetricFormFromProfile(loadedProfile, loadedMetrics));

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

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

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
      };

      setMetrics(nextMetrics);
      setProfile(nextProfile);
      setForm(buildBodyMetricFormFromProfile(nextProfile, nextMetrics));

      if (Number(form.weight) > 0) {
        updateProfile({ weightKg: Number(form.weight) })
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
      setForm(buildBodyMetricFormFromProfile(profile || {}, nextMetrics));
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
      setForm(buildBodyMetricFormFromProfile(profile || {}, nextMetrics));
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

      {error && <Alert variant="danger">{error}</Alert>}
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
