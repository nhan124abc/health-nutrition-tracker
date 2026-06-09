import { useEffect, useState } from 'react';
import { Alert, Badge, Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import BodyMetricChart from './components/BodyMetricChart';
import BodyMetricFormCard from './components/BodyMetricFormCard';
import ProfileMetrics from './components/ProfileMetrics';
import { createBodyMetric, getBodyMetrics } from './profileService';
import {
  emptyBodyMetric,
  extractBodyMetricFromApi,
  extractMetricRows,
  getApiErrorMessage,
  getTodayDate,
  mapBodyMetricToApi,
} from './profileUtils';

function BodyMetrics() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState(() => ({ ...emptyBodyMetric, date: getTodayDate() }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      setLoading(true);
      setError('');

      try {
        const response = await getBodyMetrics({ page: 0, size: 100 });

        if (isMounted) {
          setMetrics(extractMetricRows(response.data));
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

      setMetrics((current) => [
        createdMetric,
        ...current.filter((item) => item.id !== createdMetric.id),
      ]);
      setForm({ ...emptyBodyMetric, date: getTodayDate() });
      setSaved(true);
    } catch (requestError) {
      console.error('[BodyMetrics] Error saving metric:', requestError);
      setError(getApiErrorMessage(requestError, t('bodyMetricsPage.saveError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('bodyMetricsPage.badge')}</Badge>
          <h1>{t('bodyMetricsPage.title')}</h1>
          <p>{t('bodyMetricsPage.description')}</p>
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
              t={t}
              titleKey="bodyMetricsPage.historyTitle"
            />
          </Col>
        </Row>
      )}
    </>
  );
}

export default BodyMetrics;
