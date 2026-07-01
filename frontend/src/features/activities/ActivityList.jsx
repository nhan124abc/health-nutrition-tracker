import { useEffect, useMemo, useState } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import ActivityCatalogCard from './components/ActivityCatalogCard';
import ActivityTypeDetailCard from './components/ActivityTypeDetailCard';
import { getActivityTypes } from './activityService';
import {
  deriveActivityCategoriesFromTypes,
  extractActivityTypesFromApi,
  filterActivityTypes,
  normalizeActivityType,
} from './activityUtils';

function ActivityList() {
  const { i18n, t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categories = useMemo(
    () => deriveActivityCategoriesFromTypes(activities),
    [activities]
  );
  const filteredActivities = useMemo(
    () => filterActivityTypes(activities, query, category, i18n.language),
    [activities, category, i18n.language, query]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      setLoading(true);
      setError('');

      try {
        const response = await getActivityTypes();
        const normalizedActivities = extractActivityTypesFromApi(response.data).map(normalizeActivityType);

        if (isMounted) {
          setActivities(normalizedActivities);
          setSelectedActivity(normalizedActivities[0] || null);
        }
      } catch (requestError) {
        console.error('[ActivityList] Error loading activity types:', requestError);

        if (isMounted) {
          setActivities([]);
          setSelectedActivity(null);
          setError(requestError.response?.data?.message || t('activityPage.loadTypesError'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('activityListPage.title')}</h1>
        </div>
      </div>

      <ErrorModal error={error} onClose={() => setError('')} />

      {loading ? (
        <div className="py-5 text-center text-secondary">
          <Spinner animation="border" variant="success" className="mb-3" />
          <div>{t('activityListPage.loading')}</div>
        </div>
      ) : (
        <Row className="g-4">
          <Col lg={8}>
            <ActivityCatalogCard
              activities={filteredActivities}
              categories={categories}
              category={category}
              language={i18n.language}
              onCategoryChange={setCategory}
              onQueryChange={setQuery}
              onSelectActivity={setSelectedActivity}
              query={query}
              selectedActivityId={selectedActivity?.id}
              t={t}
            />
          </Col>

          <Col lg={4}>
            <ActivityTypeDetailCard
              activity={selectedActivity}
              language={i18n.language}
              t={t}
            />
          </Col>
        </Row>
      )}
    </>
  );
}

export default ActivityList;
