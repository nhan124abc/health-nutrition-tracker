import { Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
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
  language,
  onCategoryChange,
  onQueryChange,
  onSelectActivity,
  query,
  selectedActivityId,
  t,
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
        <div className="small text-secondary mt-3">
          {t('activityListPage.resultCount', { count: activities.length })}
        </div>
      </Card.Body>
    </Card>
  );
}

export default ActivityCatalogCard;
