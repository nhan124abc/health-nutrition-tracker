import { Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { FaArrowLeft, FaArrowRight, FaSearch } from 'react-icons/fa';
import { getLocalizedName } from '../../../utils/localizedName';

function getCategoryLabel(activity = {}, language = '') {
  return getLocalizedName({
    name: activity.categoryName || activity.category,
    nameVi: activity.categoryNameVi,
  }, language);
}

function getAlternateName(item = {}, language = '') {
  const primaryName = getLocalizedName(item, language);
  const alternateName = String(language).toLowerCase().startsWith('vi')
    ? item.name || ''
    : item.nameVi || '';

  return alternateName && alternateName !== primaryName ? alternateName : '';
}

function ActivityCatalogCard({
  activities,
  categories,
  category,
  currentPage,
  language,
  onCategoryChange,
  onPageChange,
  onQueryChange,
  onSelectActivity,
  pageInfo,
  query,
  resultCount,
  selectedActivityId,
  t,
  totalPages,
}) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Row className="g-3 mb-3">
          <Col md={7}>
            <InputGroup>
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t('activityListPage.searchPlaceholder')}
              />
            </InputGroup>
          </Col>
          <Col md={5}>
            <Form.Select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              <option value="all">{t('activityPage.allCategories')}</option>
              {categories.map((item) => (
                <option value={item.id} key={item.id}>{getLocalizedName(item, language)}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>{t('common.activity')}</th>
                <th>{t('common.category')}</th>
                <th className="text-end">{t('admin.table.met', 'MET')}</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => {
                const alternateName = getAlternateName(activity, language);

                return (
                  <tr
                    key={activity.id}
                    onClick={() => onSelectActivity(activity)}
                    className={`clickable-row${String(selectedActivityId) === String(activity.id) ? ' table-active' : ''}`}
                  >
                    <td>
                      <strong>{getLocalizedName(activity, language)}</strong>
                      {alternateName && <div className="text-secondary small">{alternateName}</div>}
                    </td>
                    <td>{getCategoryLabel(activity, language)}</td>
                    <td className="text-end">{activity.met}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        {!activities.length && (
          <p className="text-secondary text-center mb-0 py-4">{t('activityListPage.noResults')}</p>
        )}
        <div className="d-flex flex-column align-items-center justify-content-center gap-2 mt-3">
          <div className="d-flex align-items-center justify-content-center gap-2">
            <button
              type="button"
              className="btn pagination-arrow-btn"
              aria-label={t('plannerPage.previousPage')}
              title={t('plannerPage.previousPage')}
              disabled={currentPage <= 1}
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            >
              <FaArrowLeft />
            </button>
            <span className="small text-secondary">
              {pageInfo}
            </span>
            <button
              type="button"
              className="btn pagination-arrow-btn"
              aria-label={t('plannerPage.nextPage')}
              title={t('plannerPage.nextPage')}
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
            >
              <FaArrowRight />
            </button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ActivityCatalogCard;
