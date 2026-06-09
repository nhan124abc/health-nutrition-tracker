import { Button, Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { FaImage, FaSearch } from 'react-icons/fa';

function FoodCatalogCard({
  category,
  categories,
  foods,
  imagePreview,
  imageSearchName,
  onCategoryChange,
  onClearImage,
  onImageSearch,
  onQueryChange,
  onSelectFood,
  query,
  t,
}) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Row className="g-3 mb-3">
          <Col md={5}>
            <InputGroup>
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('nutritionPage.searchPlaceholder')} />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              <option value="all">{t('nutritionPage.allCategories')}</option>
              {categories.map((item) => (
                <option value={item.id} key={item.id}>{item.nameVi || item.name}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={4}>
            <Button as="label" htmlFor="nutrition-image-search" variant="outline-secondary" className="w-100">
              <FaImage className="me-2" />
              {t('nutritionPage.imageSearch')}
            </Button>
            <Form.Control
              id="nutrition-image-search"
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={onImageSearch}
              aria-label={t('nutritionPage.imageSearch')}
            />
            {imageSearchName && (
              <div className="d-flex align-items-center gap-2 mt-2">
                {imagePreview && <img className="nutrition-image-preview" src={imagePreview} alt={imageSearchName} />}
                <span className="small text-secondary flex-grow-1">{t('nutritionPage.imageSelected', { name: imageSearchName })}</span>
                <Button variant="outline-secondary" size="sm" onClick={onClearImage}>{t('nutritionPage.clearImage')}</Button>
              </div>
            )}
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
                    <strong>{food.nameVi}</strong>
                    <div className="text-secondary small">{food.name} - {food.brand}</div>
                  </td>
                  <td>{food.category}</td>
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
