import { Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import { getLocalizedName } from '../../../utils/localizedName';

function FoodCatalogCard({
  category,
  categories,
  foods,
  onCategoryChange,
  onQueryChange,
  onSelectFood,
  query,
  t,
  language,
}) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Row className="g-3 mb-3">
          <Col md={7}>
            <InputGroup>
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('nutritionPage.searchPlaceholder')} />
            </InputGroup>
          </Col>
          <Col md={5}>
            <Form.Select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              <option value="all">{t('nutritionPage.allCategories')}</option>
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
                <th>{t('common.food')}</th>
                <th>{t('common.category')}</th>
                <th className="text-end">{t('common.calories')}</th>
                <th className="text-end">P/C/F</th>
              </tr>
            </thead>
            <tbody>
              {foods.map((food) => (
                <tr key={food.id} onClick={() => onSelectFood(food)} className="clickable-row">
                  <td>
                    <strong>{getLocalizedName(food, language)}</strong>
                    {food.brand && <div className="text-secondary small">{food.brand}</div>}
                  </td>
                  <td>{getLocalizedName({ name: food.categoryName, nameVi: food.categoryNameVi }, language)}</td>
                  <td className="text-end">{food.calories}</td>
                  <td className="text-end">{food.protein}/{food.carbs}/{food.fat}g</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="small text-secondary mt-3">{t('nutritionPage.resultCount', { count: foods.length })}</div>
      </Card.Body>
    </Card>
  );
}

export default FoodCatalogCard;
