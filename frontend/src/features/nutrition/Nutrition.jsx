import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaImage, FaPlus, FaSearch } from 'react-icons/fa';

const foods = [
  {
    id: 'F001',
    name: 'Chicken breast',
    nameVi: 'Uc ga',
    brand: 'Fresh',
    barcode: '893001000001',
    category: 'Protein',
    servingSize: '100g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 4,
    fiber: 0,
    sugar: 0,
    sodium: 74,
    status: 'verified',
  },
  {
    id: 'F002',
    name: 'Brown rice',
    nameVi: 'Gao lut',
    brand: 'Organic',
    barcode: '893001000002',
    category: 'Grain',
    servingSize: '100g',
    calories: 111,
    protein: 3,
    carbs: 23,
    fat: 1,
    fiber: 2,
    sugar: 0,
    sodium: 5,
    status: 'verified',
  },
  {
    id: 'F003',
    name: 'Greek yogurt',
    nameVi: 'Sua chua Hy Lap',
    brand: 'Daily',
    barcode: '893001000003',
    category: 'Dairy',
    servingSize: '100g',
    calories: 97,
    protein: 9,
    carbs: 4,
    fat: 5,
    fiber: 0,
    sugar: 3,
    sodium: 36,
    status: 'pending',
  },
];

const emptyFood = {
  name: '',
  nameVi: '',
  brand: '',
  barcode: '',
  category: 'Protein',
  servingSize: '100g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  imageUrl: '',
};

function Nutrition() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [imageSearchName, setImageSearchName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFood, setSelectedFood] = useState(foods[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFood, setNewFood] = useState(emptyFood);

  const filteredFoods = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const imageKeyword = imageSearchName
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase();

    return foods.filter((food) => {
      const searchableValues = [food.name, food.nameVi, food.brand, food.category];
      const matchesKeyword = !keyword || searchableValues.some((value) =>
        value.toLowerCase().includes(keyword)
      );
      const matchesCategory = category === 'all' || food.category === category;
      const matchesImage = !imageKeyword || searchableValues.some((value) =>
        value.toLowerCase().includes(imageKeyword)
      );

      return matchesKeyword && matchesCategory && matchesImage;
    });
  }, [category, imageSearchName, query]);

  const handleNewFoodChange = (event) => {
    const { name, value } = event.target;
    setNewFood((current) => ({ ...current, [name]: value }));
  };

  const handleImageSearch = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImageSearchName('');
      setImagePreview('');
      return;
    }

    setImageSearchName(file.name);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const clearImageSearch = () => {
    setImageSearchName('');
    setImagePreview('');
  };

  const basicFields = [
    ['name', 'nutritionPage.fields.name'],
    ['nameVi', 'nutritionPage.fields.nameVi'],
    ['brand', 'common.brand'],
    ['barcode', 'common.barcode'],
    ['servingSize', 'common.servingSize'],
    ['imageUrl', 'nutritionPage.fields.imageUrl'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('nutritionPage.badge')}</Badge>
          <h1>{t('nutritionPage.title')}</h1>
          <p>{t('nutritionPage.description')}</p>
        </div>
        <Button variant="success" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" />
          {t('nutritionPage.addFood')}
        </Button>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="g-3 mb-3">
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text><FaSearch /></InputGroup.Text>
                    <Form.Control value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('nutritionPage.searchPlaceholder')} />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="all">{t('nutritionPage.allCategories')}</option>
                    <option value="Protein">Protein</option>
                    <option value="Grain">Grain</option>
                    <option value="Dairy">Dairy</option>
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
                    onChange={handleImageSearch}
                    aria-label={t('nutritionPage.imageSearch')}
                  />
                  {imageSearchName && (
                    <div className="d-flex align-items-center gap-2 mt-2">
                      {imagePreview && <img className="nutrition-image-preview" src={imagePreview} alt={imageSearchName} />}
                      <span className="small text-secondary flex-grow-1">{t('nutritionPage.imageSelected', { name: imageSearchName })}</span>
                      <Button variant="outline-secondary" size="sm" onClick={clearImageSearch}>{t('nutritionPage.clearImage')}</Button>
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
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFoods.map((food) => (
                      <tr key={food.id} onClick={() => setSelectedFood(food)} className="clickable-row">
                        <td>
                          <strong>{food.nameVi}</strong>
                          <div className="text-secondary small">{food.name} - {food.brand}</div>
                        </td>
                        <td>{food.category}</td>
                        <td className="text-end">{food.calories}</td>
                        <td className="text-end">{food.protein}/{food.carbs}/{food.fat}g</td>
                        <td>
                          <Badge bg={food.status === 'verified' ? 'success' : 'warning'}>{t(`common.statuses.${food.status}`)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="small text-secondary mt-3">{t('nutritionPage.resultCount', { count: filteredFoods.length })}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-panel">
            <Card.Body>
              <Badge bg={selectedFood.status === 'verified' ? 'success' : 'warning'} className="mb-3">
                {t(`common.statuses.${selectedFood.status}`)}
              </Badge>
              <h2 className="h4 fw-bold mb-1">{selectedFood.nameVi}</h2>
              <p className="text-secondary">{selectedFood.name} - {selectedFood.servingSize}</p>
              <div className="nutrition-detail-grid">
                {[
                  [t('common.calories'), `${selectedFood.calories} kcal`],
                  [t('common.protein'), `${selectedFood.protein} g`],
                  [t('common.carbs'), `${selectedFood.carbs} g`],
                  [t('common.fat'), `${selectedFood.fat} g`],
                  [t('common.fiber'), `${selectedFood.fiber} g`],
                  [t('common.sugar'), `${selectedFood.sugar} g`],
                  [t('common.sodium'), `${selectedFood.sodium} mg`],
                  [t('common.barcode'), selectedFood.barcode],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('nutritionPage.newFoodTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            {basicFields.map(([name, labelKey]) => (
              <Col md={6} key={name}>
                <Form.Group>
                  <Form.Label>{t(labelKey)}</Form.Label>
                  <Form.Control name={name} value={newFood[name]} onChange={handleNewFoodChange} />
                </Form.Group>
              </Col>
            ))}
            <Col md={6}>
              <Form.Group>
                <Form.Label>{t('common.category')}</Form.Label>
                <Form.Select name="category" value={newFood.category} onChange={handleNewFoodChange}>
                  <option>Protein</option>
                  <option>Grain</option>
                  <option>Dairy</option>
                  <option>Vegetable</option>
                  <option>Fruit</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].map((name) => (
              <Col md={3} key={name}>
                <Form.Group>
                  <Form.Label>{t(`common.${name}`)}</Form.Label>
                  <Form.Control type="number" name={name} value={newFood[name]} onChange={handleNewFoodChange} />
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</Button>
          <Button variant="success" onClick={() => setShowCreateModal(false)}>{t('nutritionPage.savePending')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Nutrition;
