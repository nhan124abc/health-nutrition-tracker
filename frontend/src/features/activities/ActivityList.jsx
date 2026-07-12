import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaTrashAlt } from 'react-icons/fa';
import { getCurrentUser, getCurrentUserRole } from '../../api/api';
import ErrorModal from '../../components/ErrorModal';
import { getLocalizedName } from '../../utils/localizedName';
import ActivityCatalogCard from './components/ActivityCatalogCard';
import ActivityTypeDetailCard from './components/ActivityTypeDetailCard';
import { createUserActivityType, deleteUserActivityType, getActivityTypes, updateUserActivityType } from './activityService';
import {
  deriveActivityCategoriesFromTypes,
  extractActivityTypesFromApi,
  filterActivityTypes,
  normalizeActivityType,
  parseLocalizedNumber,
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [pendingDeleteActivity, setPendingDeleteActivity] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    nameVi: '',
    category: 'cardio',
    metValue: '3.0',
    icon: '',
    description: '',
    hidden: false,
  });
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();
  const currentUserRole = getCurrentUserRole();
  const currentUserId = currentUser?.id ?? currentUser?.userId;

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

  const updateCreateForm = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateActivity = async (event) => {
    event.preventDefault();
    const metValue = parseLocalizedNumber(createForm.metValue);

    if (!createForm.name.trim() || !createForm.category || !Number.isFinite(metValue) || metValue < 0.1 || metValue > 50) {
      setError(t('activityListPage.requiredMetricsError'));
      return;
    }

    setSavingActivity(true);
    setError('');

    try {
      const payload = {
        name: createForm.name.trim(),
        nameVi: createForm.nameVi.trim() || null,
        category: String(createForm.category || 'other').toUpperCase(),
        metValue,
        icon: createForm.icon.trim() || null,
        description: createForm.description.trim() || null,
        hidden: Boolean(createForm.hidden),
      };
      const response = editingActivity
        ? await updateUserActivityType(editingActivity.id, payload)
        : await createUserActivityType(payload);
      const normalizedCreatedActivity = normalizeActivityType(response.data?.data || response.data);
      const createdActivity = {
        ...normalizedCreatedActivity,
        createdByUserId: normalizedCreatedActivity.createdByUserId ?? editingActivity?.createdByUserId ?? currentUserId ?? null,
      };

      setActivities((currentActivities) => {
        if (editingActivity) {
          return currentActivities.map((item) => (String(item.id) === String(createdActivity.id) ? createdActivity : item));
        }
        return [createdActivity, ...currentActivities];
      });
      setSelectedActivity(createdActivity);
      setCreateForm({
        name: '',
        nameVi: '',
        category: 'cardio',
        metValue: '3.0',
        icon: '',
        description: '',
        hidden: false,
      });
      setEditingActivity(null);
      setShowCreateModal(false);
      setSuccessMessage(editingActivity
        ? t('activityListPage.updateSuccess', 'Đã cập nhật hoạt động thành công.')
        : t('activityListPage.createSuccess', 'Đã thêm hoạt động thành công.'));
    } catch (requestError) {
      console.error('[ActivityList] Error creating activity type:', requestError);
      setError(requestError.response?.data?.message || t(editingActivity ? 'activityPage.saveError' : 'activityListPage.createError'));
    } finally {
      setSavingActivity(false);
    }
  };

  const canManageActivity = (activity) => {
    if (!activity) {
      return false;
    }

    const isAdmin = currentUserRole === 'ADMIN';
    const isOwner = activity.createdByUserId != null
      && currentUserId != null
      && String(activity.createdByUserId) === String(currentUserId);

    return isAdmin || isOwner;
  };

  const startEditActivity = (activity) => {
    setEditingActivity(activity);
    setCreateForm({
      name: activity.name || '',
      nameVi: activity.nameVi || '',
      category: activity.category || 'cardio',
      metValue: String(activity.met || '3.0'),
      icon: activity.icon || '',
      description: activity.description || '',
      hidden: Boolean(activity.hidden),
    });
    setShowCreateModal(true);
  };

  const closeActivityModal = () => {
    setShowCreateModal(false);
    setEditingActivity(null);
    setCreateForm({
      name: '',
      nameVi: '',
      category: 'cardio',
      metValue: '3.0',
      icon: '',
      description: '',
      hidden: false,
    });
  };

  const handleDeleteActivity = (activity) => {
    setPendingDeleteActivity(activity);
  };

  const confirmDeleteActivity = async () => {
    if (!pendingDeleteActivity) {
      return;
    }

    setDeletingActivity(true);
    try {
      await deleteUserActivityType(pendingDeleteActivity.id);
      setActivities((currentActivities) => currentActivities.filter((item) => String(item.id) !== String(pendingDeleteActivity.id)));
      setSelectedActivity((currentActivity) => {
        if (String(currentActivity?.id) !== String(pendingDeleteActivity.id)) {
          return currentActivity;
        }
        return activities.find((item) => String(item.id) !== String(pendingDeleteActivity.id)) || null;
      });
      setPendingDeleteActivity(null);
      setSuccessMessage(t('activityListPage.deleteSuccess', 'Đã xóa hoạt động thành công.'));
    } catch (requestError) {
      console.error('[ActivityList] Error deleting activity type:', requestError);
      setError(requestError.response?.data?.message || t('activityListPage.deleteError'));
    } finally {
      setDeletingActivity(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('activityListPage.title')}</h1>
        </div>
        <Button variant="success" onClick={() => {
          setEditingActivity(null);
          setCreateForm({
            name: '',
            nameVi: '',
            category: 'cardio',
            metValue: '3.0',
            icon: '',
            description: '',
            hidden: false,
          });
          setShowCreateModal(true);
        }}>
          {t('activityListPage.addActivity')}
        </Button>
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
              canDelete={canManageActivity(selectedActivity)}
              canEdit={canManageActivity(selectedActivity)}
              language={i18n.language}
              onDelete={handleDeleteActivity}
              onEdit={startEditActivity}
              t={t}
            />
          </Col>
        </Row>
      )}

      <Modal show={showCreateModal} onHide={closeActivityModal} centered>
        <Form onSubmit={handleCreateActivity}>
          <Modal.Header closeButton>
            <Modal.Title>{editingActivity ? t('activityPage.updateActivity') : t('activityListPage.addActivity')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>{i18n.language?.startsWith('vi') ? 'Tên hoạt động' : 'Activity name'}</Form.Label>
                <Form.Control value={createForm.name} onChange={(event) => updateCreateForm('name', event.target.value)} required />
              </Col>
              <Col md={6}>
                <Form.Label>{t('activityPage.fields.nameVi')}</Form.Label>
                <Form.Control value={createForm.nameVi} onChange={(event) => updateCreateForm('nameVi', event.target.value)} />
              </Col>
              <Col md={6}>
                <Form.Label>{i18n.language?.startsWith('vi') ? 'Nhóm' : 'Group'}</Form.Label>
                <Form.Select value={createForm.category} onChange={(event) => updateCreateForm('category', event.target.value)} required>
                  {(categories.length ? categories : [
                    { id: 'cardio', name: 'CARDIO', nameVi: 'Cardio' },
                    { id: 'strength', name: 'STRENGTH', nameVi: 'Tập sức mạnh' },
                    { id: 'walking', name: 'WALKING', nameVi: 'Đi bộ' },
                  { id: 'sports', name: 'SPORTS', nameVi: 'Thể thao' },
                  { id: 'other', name: 'OTHER', nameVi: 'Khác' },
                  ]).map((item) => (
                    <option value={item.id} key={item.id}>{getLocalizedName(item, i18n.language) || item.id}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>{t('admin.table.met', 'MET')}</Form.Label>
                <Form.Control inputMode="decimal" min="0.1" max="50" value={createForm.metValue} onChange={(event) => updateCreateForm('metValue', event.target.value)} required />
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id="activity-type-hidden"
                  label={i18n.language?.startsWith('vi') ? 'Ẩn hoạt động này' : 'Hide this activity'}
                  checked={Boolean(createForm.hidden)}
                  onChange={(event) => updateCreateForm('hidden', event.target.checked)}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeActivityModal} disabled={savingActivity}>
              {t('common.close')}
            </Button>
            <Button variant="success" type="submit" disabled={savingActivity}>
              {savingActivity
                ? t('activityPage.saving')
                : t(editingActivity ? 'activityPage.updateActivity' : 'activityPage.saveActivity')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(pendingDeleteActivity)} onHide={() => setPendingDeleteActivity(null)} centered className="logout-confirm-modal">
        <Modal.Header closeButton className="logout-confirm-header">
          <div className="logout-confirm-icon">
            <FaTrashAlt />
          </div>
          <Modal.Title>{t('waterPage.confirmDeleteTitle', 'Xác nhận xóa')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="logout-confirm-body">
          {t('admin.catalogData.confirmDeleteActivity', 'Bạn có chắc muốn xóa hoạt động này?')}
        </Modal.Body>
        <Modal.Footer className="logout-confirm-footer">
          <Button variant="outline-secondary" className="logout-confirm-cancel" onClick={() => setPendingDeleteActivity(null)} disabled={deletingActivity}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" className="logout-confirm-submit" onClick={confirmDeleteActivity} disabled={deletingActivity}>
            {deletingActivity ? t('activityPage.deleting') : t('activityPage.deleteAction')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(successMessage)} onHide={() => setSuccessMessage('')} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('waterPage.successTitle', 'Thành công')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSuccessMessage('')}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ActivityList;
