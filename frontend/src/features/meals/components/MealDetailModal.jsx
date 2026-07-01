import { Modal, Table } from 'react-bootstrap';
import { formatCalories, getMealDisplayName, getMealTotals, mealTypes } from '../mealUtils';

function MealDetailModal({ loading, meal, onClose, t }) {
  const getTitle = () => {
    if (!meal) {
      return '';
    }

    const type = mealTypes.find((item) => item.key === meal.type);
    const label = type ? t(type.labelKey) : meal.type;
    return `${label} - ${meal.time || meal.date}`;
  };

  const totals = meal ? getMealTotals(meal) : null;
  const notes = meal?.notes || (meal?.notesKey ? t(meal.notesKey) : '');
  const mealName = meal ? getMealDisplayName(meal, getTitle()) : '';
  const shouldShowNotes = notes && notes !== mealName && !notes.endsWith(`: ${mealName}`);

  return (
    <Modal show={Boolean(meal)} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{getTitle()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && <div className="alert alert-light border">{t('foodDiaryPage.loadingDetail')}</div>}
        {meal && (
          <>
            <h3 className="h5 fw-bold mb-1">{mealName}</h3>
            <p className="text-secondary mb-3">{shouldShowNotes ? notes : t('common.noNotes')}</p>
            <div className="nutrition-detail-grid mb-4">
              <div><span>{t('common.calories')}</span><strong>{formatCalories(totals.calories)} kcal</strong></div>
              <div><span>{t('common.protein')}</span><strong>{totals.protein}g</strong></div>
              <div><span>{t('common.carbs')}</span><strong>{totals.carbs}g</strong></div>
              <div><span>{t('common.fat')}</span><strong>{totals.fat}g</strong></div>
              <div><span>{t('common.fiber')}</span><strong>{totals.fiber}g</strong></div>
              <div><span>{t('common.sodium')}</span><strong>{totals.sodium}mg</strong></div>
            </div>
            <div className="table-responsive">
              <Table size="sm" hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('common.food')}</th>
                    <th>{t('common.serving')}</th>
                    <th className="text-end">{t('common.quantityShort')}</th>
                    <th className="text-end">{t('common.calories')}</th>
                    <th className="text-end">P/C/F</th>
                    <th className="text-end">{t('common.fiber')}</th>
                    <th className="text-end">{t('common.sodium')}</th>
                  </tr>
                </thead>
                <tbody>
                  {meal.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.serving}</td>
                      <td className="text-end">{item.quantity}</td>
                      <td className="text-end">{formatCalories(item.calories)}</td>
                      <td className="text-end">{item.protein}/{item.carbs}/{item.fat}g</td>
                      <td className="text-end">{item.fiber}g</td>
                      <td className="text-end">{item.sodium}mg</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default MealDetailModal;
