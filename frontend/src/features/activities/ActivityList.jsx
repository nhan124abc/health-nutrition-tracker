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

const ACTIVITY_PAGE_SIZE = 30;

function ActivityList() {
  const { i18n, t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / ACTIVITY_PAGE_SIZE));
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ACTIVITY_PAGE_SIZE;
    return filteredActivities.slice(startIndex, startIndex + ACTIVITY_PAGE_SIZE);
  }, [currentPage, filteredActivities]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, query, i18n.language]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
              activities={paginatedActivities}
              categories={categories}
              category={category}
              currentPage={currentPage}
              language={i18n.language}
              onCategoryChange={setCategory}
              onPageChange={setCurrentPage}
              onQueryChange={setQuery}
              onSelectActivity={setSelectedActivity}
              pageInfo={t('plannerPage.activityPageInfo', {
                page: currentPage,
                total: totalPages,
                count: filteredActivities.length,
              })}
              query={query}
              resultCount={filteredActivities.length}
              selectedActivityId={selectedActivity?.id}
              t={t}
              totalPages={totalPages}
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
