import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle } from 'react-icons/fa';
import { getHealthInsights, markHealthInsightRead } from '../features/analytics/analyticsService';

function HealthInsights() {
  const { i18n, t } = useTranslation();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [markingInsightId, setMarkingInsightId] = useState(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language]
  );

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await getHealthInsights({ unreadOnly: false });
      const data = response.data?.data ?? response.data ?? [];
      setInsights(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[HealthInsights] Error loading insights:', error);
      setLoadError(error.response?.data?.message || t('healthInsightsPage.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleMarkRead = async (insightId) => {
    setMarkingInsightId(insightId);

    try {
      const response = await markHealthInsightRead(insightId);
      const updatedInsight = response.data?.data ?? response.data ?? null;

      setInsights((current) =>
        current.map((insight) => {
          if (insight.id !== insightId) {
            return insight;
          }

          return updatedInsight || { ...insight, read: true };
        })
      );
    } catch (error) {
      console.error('[HealthInsights] Error marking insight read:', error);
      setLoadError(error.response?.data?.message || t('healthInsightsPage.markReadError'));
    } finally {
      setMarkingInsightId(null);
    }
  };

  const totalCount = insights.length;
  const unreadCount = insights.filter((insight) => !insight.read).length;
  const readCount = totalCount - unreadCount;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 className="d-flex align-items-center gap-2">
            <span>{t('healthInsightsPage.title')}</span>
          </h1>
        </div>
      </div>

      {loadError && <div className="alert alert-warning">{loadError}</div>}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm health-insight-summary-card">
            <Card.Body>
              <div className="text-secondary small fw-semibold mb-1">{t('healthInsightsPage.summary.total')}</div>
              <div className="metric-value">{totalCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm health-insight-summary-card">
            <Card.Body>
              <div className="text-secondary small fw-semibold mb-1">{t('healthInsightsPage.summary.unread')}</div>
              <div className="metric-value">{unreadCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm health-insight-summary-card">
            <Card.Body>
              <div className="text-secondary small fw-semibold mb-1">{t('healthInsightsPage.summary.read')}</div>
              <div className="metric-value">{readCount}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div className="alert alert-light border">{t('healthInsightsPage.loading')}</div>
      ) : insights.length === 0 ? (
        <div className="alert alert-light border">{t('healthInsightsPage.empty')}</div>
      ) : (
        <Row className="g-3">
          {insights.map((insight) => {
            const read = Boolean(insight.read);
            const typeLabel = t(
              `healthInsightsPage.types.${insight.insightType}`,
              insight.insightType || t('healthInsightsPage.types.UNKNOWN')
            );
            const dateValue = insight.validDate || insight.createdAt;

            return (
              <Col lg={4} md={6} key={insight.id}>
                <Card className={`border-0 shadow-sm h-100 health-insight-card ${read ? 'health-insight-card-read' : ''}`}>
                  <Card.Body className={`health-insight-item ${read ? 'health-insight-read-state' : ''}`}>
                    <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                      <Badge bg={read ? 'secondary' : 'success'} pill className="health-insight-badge">
                        {typeLabel}
                      </Badge>
                      {read ? (
                        <span className="health-insight-read-tag">{t('healthInsightsPage.status.read')}</span>
                      ) : (
                        <span className="health-insight-unread-dot" aria-hidden="true" />
                      )}
                    </div>

                    <h3>{insight.title}</h3>
                    <p>{insight.content}</p>

                    <div className="d-flex align-items-center justify-content-between gap-3 mt-auto">
                      <small className="text-secondary">
                        {dateValue
                          ? t('healthInsightsPage.updatedAt', {
                              date: dateFormatter.format(new Date(dateValue)),
                            })
                          : ' '}
                      </small>

                      {!read ? (
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="health-insight-read"
                          disabled={markingInsightId === insight.id}
                          onClick={() => handleMarkRead(insight.id)}
                        >
                          {markingInsightId === insight.id ? (
                            <Spinner animation="border" size="sm" className="me-2" />
                          ) : (
                            <FaCheckCircle />
                          )}
                          {markingInsightId === insight.id
                            ? t('healthInsightsPage.marking')
                            : t('healthInsightsPage.markRead')}
                        </Button>
                      ) : (
                        <span className="health-insight-read-confirm">
                          <FaCheckCircle />
                          {t('healthInsightsPage.status.read')}
                        </span>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );
}

export default HealthInsights;
