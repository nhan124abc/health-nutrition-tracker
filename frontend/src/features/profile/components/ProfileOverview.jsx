import { Card, Col, Row } from 'react-bootstrap';

function ProfileOverview({ account, bmi, profile, t }) {
  const summaryItems = [
    ['BMI', bmi || '-'],
    [t('health.bmr', 'BMR'), profile.bmr ? `${profile.bmr} kcal` : '-'],
    [t('health.tdee'), profile.tdee ? `${profile.tdee} kcal` : '-'],
    [t('profilePage.fields.activityFactor', 'Activity factor'), profile.activityFactor || '-'],
    [t('common.goal'), profile.healthGoal ? t(`profilePage.goals.${profile.healthGoal}`) : '-'],
    [t('common.calories'), profile.dailyCalorieGoal ? `${profile.dailyCalorieGoal} kcal` : '-'],
    [t('common.water'), profile.dailyWaterGoal ? `${profile.dailyWaterGoal} ml` : '-'],
    [t('common.timezone'), profile.timezone || '-'],
  ];

  return (
    <Row className="g-4">
      <Col lg={8}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Card.Title className="fw-bold mb-3">{t('profilePage.healthProfile')}</Card.Title>
            <div className="nutrition-detail-grid">
              <div><span>{t('profilePage.fields.username')}</span><strong>{profile.username || '-'}</strong></div>
              <div><span>{t('profile.gender')}</span><strong>{profile.gender ? t(`profile.${profile.gender}`) : '-'}</strong></div>
              <div><span>{t('profile.activityLevel')}</span><strong>{profile.activityLevel ? t(`profile.${profile.activityLevel === 'very_active' ? 'veryActive' : profile.activityLevel}`) : '-'}</strong></div>
              <div><span>{t('profile.height')}</span><strong>{profile.height || '-'} cm</strong></div>
              <div><span>{t('profile.weight')}</span><strong>{profile.weight || '-'} kg</strong></div>
              <div><span>{t('common.protein')}</span><strong>{profile.dailyProteinGoal ? `${profile.dailyProteinGoal} g` : '-'}</strong></div>
              <div><span>{t('common.carbs')}</span><strong>{profile.dailyCarbsGoal ? `${profile.dailyCarbsGoal} g` : '-'}</strong></div>
              <div><span>{t('common.fat')}</span><strong>{profile.dailyFatGoal ? `${profile.dailyFatGoal} g` : '-'}</strong></div>
              <div><span>{t('common.bio')}</span><strong>{profile.bio || '-'}</strong></div>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4}>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <Card.Title className="fw-bold mb-3">{t('profilePage.currentAccount')}</Card.Title>
            {account?.email && <p className="text-secondary mb-3">{account.email}</p>}
            <div className="nutrition-detail-grid">
              {summaryItems.map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default ProfileOverview;
