import { useEffect, useState } from 'react';
import { Button, Col, Modal, Row, Spinner } from 'react-bootstrap';
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

function getActivityFactor(activityLevel) {
  return {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[activityLevel] || 1.2;
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
  const tdee = bmr * getActivityFactor(profileData?.activityLevel);
  const sex = gender === 'male' ? 1 : 0;
  const bodyFat = 1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4;

  return {
    bmi: bmi.toFixed(1),
    bmr: String(Math.round(bmr)),
    tdee: String(Math.round(tdee)),
    bodyFat: Math.max(0, bodyFat).toFixed(1),
  };
}

function applyCalculatedMetricValues(currentForm, profileData) {
  const calculated = calculateBodyMetricValues(currentForm, profileData);
  const nextValues = calculated || { bmi: '', bmr: '', tdee: '', bodyFat: '' };

  if (
    String(currentForm.bmi || '') === String(nextValues.bmi || '') &&
    String(currentForm.bmr || '') === String(nextValues.bmr || '') &&
    String(currentForm.tdee || '') === String(nextValues.tdee || '') &&
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
  const [successMessageKey, setSuccessMessageKey] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
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
    tdee: metric.tdee ?? '',
    waist: metric.waistCm ?? metric.waist ?? '',
    hip: metric.hipCm ?? metric.hip ?? '',
    chest: metric.chestCm ?? metric.chest ?? '',
  });

  const openEditMetric = (metric) => {
    if (updating) {
      return;
    }

    setEditingMetric(metric);
    setForm(mapMetricToForm(metric));
    setSuccessMessageKey('');
  };

  const addMetric = async (event) => {
    event.preventDefault();

    if (editingMetric) {
      updateMetric(event);
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);
    setSuccessMessageKey('');
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
      setEditingMetric(null);

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

      setSuccessMessageKey('bodyMetricsPage.savedMessage');
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
    setSuccessMessageKey('');
    setError('');

    try {
      const response = await updateBodyMetric(editingMetric.id, mapBodyMetricToApi(form));
      const updatedMetric = extractBodyMetricFromApi(response.data);
      const nextMetrics = metrics.map((item) => (
        item.id === editingMetric.id ? { ...item, ...updatedMetric } : item
      ));

      setMetrics(nextMetrics);
      setForm(createEmptyMetricForm());
      syncProfileWeight(nextMetrics);
      setEditingMetric(null);
      setSuccessMessageKey('bodyMetricsPage.savedMessage');
    } catch (requestError) {
      console.error('[BodyMetrics] Error updating metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.updateError')));
    } finally {
      setUpdating(false);
    }
  };

  const removeMetric = (metric) => {
    setDeleteCandidate(metric);
  };

  const closeDeleteConfirm = () => {
    if (deleting) {
      return;
    }

    setDeleteCandidate(null);
  };

  const confirmDeleteMetric = async () => {
    if (!deleteCandidate || deleting) {
      return;
    }

    setDeleting(true);
    setSuccessMessageKey('');
    setError('');

    try {
      await deleteBodyMetric(deleteCandidate.id);
      const nextMetrics = metrics.filter((item) => item.id !== deleteCandidate.id);

      setMetrics(nextMetrics);
      setForm(createEmptyMetricForm());
      setEditingMetric(null);
      setDeleteCandidate(null);
      syncProfileWeight(nextMetrics);
      setSuccessMessageKey('bodyMetricsPage.deletedMessage');
    } catch (requestError) {
      console.error('[BodyMetrics] Error deleting metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.deleteError')));
    } finally {
      setDeleting(false);
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
              saving={saving || updating}
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
              editingMetric={editingMetric}
              t={t}
              titleKey="bodyMetricsPage.historyTitle"
            />
          </Col>
        </Row>
      )}

      <Modal show={Boolean(deleteCandidate)} onHide={closeDeleteConfirm} centered>
        <Modal.Header closeButton={!deleting}>
          <Modal.Title>{t('bodyMetricsPage.confirmDeleteTitle', 'Xác nhận xóa')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('bodyMetricsPage.confirmDeleteMetric')}</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeDeleteConfirm} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDeleteMetric} disabled={deleting}>
            {deleting ? t('bodyMetricsPage.deleting', 'Đang xóa...') : t('bodyMetricsPage.deleteMetric')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(successMessageKey)} onHide={() => setSuccessMessageKey('')} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('bodyMetricsPage.successTitle', 'Thành công')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessageKey ? t(successMessageKey) : ''}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSuccessMessageKey('')}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default BodyMetrics;
