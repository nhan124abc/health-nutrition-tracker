import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaRobot, FaUtensils, FaDumbbell } from 'react-icons/fa';
import { getAiPlanSuggestions } from '../features/ai/aiService';
import { createMeal, getMealsByDate, deleteMealById } from '../features/meals/mealService';
import { extractMealsFromApi, getMealsTotals, normalizeMealFromApi } from '../features/meals/mealUtils';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';
import { getActivitiesByDate, createActivityLog, deleteActivityById } from '../features/activities/activityService';

function today() {
  return new Date().toLocaleDateString('en-CA');
}

const mealTypes = [
  ['breakfast', 'plannerPage.mealTypes.breakfast'],
  ['lunch', 'plannerPage.mealTypes.lunch'],
  ['dinner', 'plannerPage.mealTypes.dinner'],
  ['afternoon_snack', 'plannerPage.mealTypes.snack'],
  ['exercise', 'plannerPage.mealTypes.exercise'],
];

function Planner() {
  const { i18n, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loggingActivity, setLoggingActivity] = useState(null);
  const [deletingActivityId, setDeletingActivityId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestedNames, setSuggestedNames] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestedNames')) || {}; } catch { return {}; }
  });
  const [suggestionOffsets, setSuggestionOffsets] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestionOffsets')) || {}; } catch { return {}; }
  });

  const totals = useMemo(() => getMealsTotals(meals), [meals]);
  const calorieGoal = Number(profile?.dailyCalorieGoal) || 2000;
  const remaining = Math.max(0, calorieGoal - totals.calories);
  const hasInvalidDailyTotal = totals.calories > calorieGoal * 2;
  const progress = Math.round((totals.calories / Math.max(calorieGoal, 1)) * 100);

  const loggedMealsForSlot = useMemo(() => {
    return meals.filter((meal) => meal.type === selectedMeal);
  }, [meals, selectedMeal]);

  const hasLoggedMealInSlot = loggedMealsForSlot.length > 0;

  const hasLoggedActivityInSlot = useMemo(() => {
    if (selectedMeal === 'exercise') {
      return activities.some((act) =>
        (suggestion?.options || []).some((opt) => opt.name === act.activityName)
      );
    }
    return false;
  }, [activities, selectedMeal, suggestion]);

  const isOptionLogged = (optionName) => {
    if (selectedMeal === 'exercise') {
      return activities.some((act) => act.activityName === optionName);
    }
    return loggedMealsForSlot.some((meal) =>
      (meal.items || []).some((item) => item.name === optionName)
    );
  };

  useEffect(() => {
    Promise.all([getProfile(), getMealsByDate(today()), getActivitiesByDate(today())])
      .then(([profileResponse, mealsResponse, activitiesResponse]) => {
        setProfile(mapProfileFromApi(extractProfileFromApi(profileResponse.data)));
        setMeals(extractMealsFromApi(mealsResponse.data).map(normalizeMealFromApi));
        const actList = Array.isArray(activitiesResponse.data) 
          ? activitiesResponse.data 
          : activitiesResponse.data?.content || activitiesResponse.data?.data || [];
        setActivities(actList);
      })
      .catch((err) => setError(err.response?.data?.message || t('plannerPage.errors.load')))
      .finally(() => setLoading(false));
  }, [t]);

  const generate = async () => {
    setGenerating(true);
    setSuggestion(null);
    setSelectedOption(null);
    setError('');
    setSuccess('');
    try {
      const existingNames = selectedMeal === 'exercise'
        ? activities.map((act) => act.activityName).filter(Boolean)
        : meals
            .filter((meal) => meal.type === selectedMeal)
            .flatMap((meal) => meal.items || [])
            .map((item) => item.name)
            .filter(Boolean);
      const response = await getAiPlanSuggestions({
        dailyCalorieGoal: calorieGoal,
        caloriesConsumed: hasInvalidDailyTotal ? 0 : Math.round(totals.calories),
        mealType: selectedMeal,
        goal: profile?.healthGoal?.toUpperCase() || 'MAINTAIN_WEIGHT',
        weightKg: Number(profile?.weight) || 70,
        targetWeightKg: Number(profile?.targetWeight) || Number(profile?.weight) || 70,
        activityLevel: profile?.activityLevel?.toUpperCase() || 'SEDENTARY',
        heightCm: Number(profile?.height) || 170,
        gender: profile?.gender?.toUpperCase() || 'MALE',
        excludedFoodNames: [...new Set([...existingNames, ...(suggestedNames[selectedMeal] || [])])],
        suggestionOffset: suggestionOffsets[selectedMeal] || 0,
        locale: i18n.language,
      });
      setSuggestion(response.data);
      setSuggestedNames((current) => {
        const next = {
          ...current,
          [selectedMeal]: [
            ...(current[selectedMeal] || []),
            ...(response.data?.options || []).map((option) => option.name),
          ],
        };
        sessionStorage.setItem('plannerSuggestedNames', JSON.stringify(next));
        return next;
      });
      setSuggestionOffsets((current) => {
        const next = { ...current, [selectedMeal]: (current[selectedMeal] || 0) + 1 };
        sessionStorage.setItem('plannerSuggestionOffsets', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.generate'));
    } finally {
      setGenerating(false);
    }
  };

  const addOption = async (option, index) => {
    setSaving(true);
    setError('');
    try {
      const optionCalories = Number(option.calories) || 0;
      if (optionCalories <= 0 || optionCalories > remaining || optionCalories > Number(suggestion?.mealBudget || remaining)) {
        throw new Error(t('plannerPage.errors.overBudget'));
      }

      // AI đã trả tổng dinh dưỡng cho toàn bộ phần ăn. Gửi thẳng sang Meal API,
      // không quy đổi thêm theo servingSizeG để tránh nhân calories hai lần.
      const payload = {
        mealType: selectedMeal.toUpperCase(),
        mealDate: today(),
        mealTime: null,
        notes: t('plannerPage.savedNotes.meal'),
        items: [{
          itemType: 'FOOD',
          foodItemId: null,
          recipeId: null,
          foodName: option.name,
          servingSizeG: Number(option.servingSizeG) || 100,
          quantity: 1,
          calories: optionCalories,
          proteinG: Number(option.proteinG) || 0,
          carbsG: Number(option.carbsG) || 0,
          fatG: Number(option.fatG) || 0,
          fiberG: Number(option.fiberG) || 0,
          sodiumMg: Number(option.sodiumMg) || 0,
        }],
      };
      const response = await createMeal(payload);
      setMeals((current) => [...current, normalizeMealFromApi(response.data)]);
      setSelectedOption(index);
      setSuccess(t('plannerPage.success.mealAdded', { name: option.name }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('plannerPage.errors.addMeal'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (mealId) => {
    setSaving(true);
    setDeletingId(mealId);
    setError('');
    setSuccess('');
    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((m) => m.id !== mealId));
      setSelectedOption(null);
      setSuccess(t('plannerPage.success.mealDeleted'));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.deleteMeal'));
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const handleLogActivity = async (activity, idx) => {
    setSaving(true);
    setLoggingActivity(idx);
    setError('');
    setSuccess('');
    const todayDate = today();

    const payload = {
      activityName: activity.name,
      durationMinutes: Number(activity.durationMinutes) || 30,
      caloriesBurned: Number(activity.caloriesBurned || activity.calories) || 150,
      loggedAt: `${todayDate}T12:00:00`,
      notes: t('plannerPage.savedNotes.activity'),
      category: 'CARDIO',
    };

    try {
      const response = await createActivityLog(payload);
      setActivities((current) => [...current, response.data]);
      setSelectedOption(idx);
      setSuccess(t('plannerPage.success.activityAdded', { name: activity.name }));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.addActivity'));
    } finally {
      setSaving(false);
      setLoggingActivity(null);
    }
  };

  const handleDeleteActivity = async (activityLogId) => {
    setSaving(true);
    setDeletingActivityId(activityLogId);
    setError('');
    setSuccess('');
    try {
      await deleteActivityById(activityLogId);
      setActivities((current) => current.filter((act) => act.id !== activityLogId));
      setSelectedOption(null);
      setSuccess(t('plannerPage.success.activityDeleted'));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.deleteActivity'));
    } finally {
      setSaving(false);
      setDeletingActivityId(null);
    }
  };

  if (loading) return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;

  const selectedMealLabel = t(mealTypes.find(([key]) => key === selectedMeal)?.[1] || '');

  return <>
    <div className="page-heading">
      <div>
        <Badge bg="success" className="mb-2">{t('plannerPage.badge')}</Badge>
        <h1>{t('plannerPage.title')}</h1>
      </div>
    </div>
    {error && <Alert variant="danger">{error}</Alert>}
    {success && <Alert variant="success">{success}</Alert>}
    <Row className="g-4">
      <Col lg={4}>
        <Card className="border-0 shadow-sm"><Card.Body>
          <h2 className="h5 fw-bold">{t('plannerPage.calorieBudget')}</h2>
          <div className="display-6 fw-bold text-success">{remaining} kcal</div>
          <p className="text-secondary">{t('plannerPage.consumed', { consumed: totals.calories, goal: calorieGoal })}</p>
          <ProgressBar now={Math.min(progress, 100)} variant={progress > 100 ? 'danger' : 'success'} className="mb-4" />
          <Form.Group className="mb-3"><Form.Label>{t('plannerPage.selectSlot')}</Form.Label><Form.Select value={selectedMeal} onChange={(e) => { setSelectedMeal(e.target.value); setSuggestion(null); setSelectedOption(null); }}>
            {mealTypes.map(([value, labelKey]) => <option value={value} key={value}>{t(labelKey)}</option>)}
          </Form.Select></Form.Group>
          <Button className="w-100" variant={selectedMeal === 'exercise' ? 'primary' : 'success'} onClick={generate} disabled={generating || (selectedMeal !== 'exercise' && remaining < 100 && !hasInvalidDailyTotal)}><FaRobot className="me-2" />{generating ? t('plannerPage.generating') : t('plannerPage.createOptions')}</Button>
          {suggestion && <Button className="w-100 mt-2" variant={selectedMeal === 'exercise' ? 'outline-primary' : 'outline-success'} onClick={generate} disabled={generating}><FaRobot className="me-2" />{t('plannerPage.createOtherOptions')}</Button>}
          {hasInvalidDailyTotal && <Alert variant="danger" className="mt-3 mb-0 py-2">{t('plannerPage.invalidTotal')}</Alert>}
          {!hasInvalidDailyTotal && selectedMeal !== 'exercise' && remaining < 100 && <Alert variant="warning" className="mt-3 mb-0 py-2">{t('plannerPage.insufficientCalories')}</Alert>}
        </Card.Body></Card>
      </Col>
      <Col lg={8}>
        {selectedMeal !== 'exercise' && loggedMealsForSlot.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-success bg-opacity-10 border border-success border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-success mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('plannerPage.loggedMealsTitle', { meal: selectedMealLabel.toLocaleLowerCase(i18n.language) })}
              </h3>
              <Row className="g-3">
                {loggedMealsForSlot.map((meal) =>
                  (meal.items || []).map((item, idx) => (
                    <Col md={6} key={item.id || idx}>
                      <Card className="border-0 shadow-sm bg-white h-100">
                        <Card.Body className="d-flex flex-column p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-dark">{item.name}</span>
                            <Badge bg="success">{item.calories} kcal</Badge>
                          </div>
                          <div className="text-secondary small mb-3">{t('plannerPage.serving')}: {item.serving}</div>
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{item.protein}g</strong></span>
                            <span>{t('common.carbs')}<strong>{item.carbs}g</strong></span>
                            <span>{t('common.fat')}<strong>{item.fat}g</strong></span>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="mt-auto w-100"
                            disabled={saving}
                            onClick={() => deleteMeal(meal.id)}
                          >
                            {deletingId === meal.id ? t('plannerPage.deleting') : t('plannerPage.removeMeal')}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
            </Card.Body>
          </Card>
        )}

        {selectedMeal === 'exercise' && activities.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('plannerPage.loggedActivitiesTitle')}
              </h3>
              <Row className="g-3">
                {activities.map((act) => (
                  <Col md={6} key={act.id}>
                    <Card className="border-0 shadow-sm bg-white h-100">
                      <Card.Body className="d-flex flex-column p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold text-dark">{act.activityName}</span>
                          <Badge bg="primary">{Math.round(act.caloriesBurned)} kcal</Badge>
                        </div>
                        <div className="text-secondary small mb-3">{t('plannerPage.duration', { minutes: act.durationMinutes })}</div>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          className="mt-auto w-100"
                          disabled={saving}
                          onClick={() => handleDeleteActivity(act.id)}
                        >
                          {deletingActivityId === act.id ? t('plannerPage.deleting') : t('plannerPage.removeActivity')}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {!suggestion && !generating && (
          <Alert variant="light" className="border">
            {selectedMeal === 'exercise' ? (
              activities.length > 0
                ? t('plannerPage.empty.loggedActivity')
                : t('plannerPage.empty.selectActivity')
            ) : (
              loggedMealsForSlot.length > 0
                ? t('plannerPage.empty.loggedMeal', { meal: selectedMealLabel.toLocaleLowerCase(i18n.language) })
                : t('plannerPage.empty.selectMeal')
            )}
          </Alert>
        )}

        {generating && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-5 text-center">
              <Spinner animation="grow" variant={selectedMeal === 'exercise' ? 'primary' : 'success'} />
              <p className="mt-3 mb-0">{t('plannerPage.findingOptions')}</p>
            </Card.Body>
          </Card>
        )}

        {suggestion && (
          <>
            {selectedMeal === 'exercise' ? (
              <Alert variant="primary">
                {t('plannerPage.suggestion.activityMessage')}
              </Alert>
            ) : (
              <Alert variant="info">
                {t('plannerPage.suggestion.mealMessage')} {t('plannerPage.suggestion.mealBudget')}: <strong>{suggestion.mealBudget} kcal</strong>.
              </Alert>
            )}
            <Row className="g-3">
              {(suggestion.options || []).map((option, index) => {
                const logged = isOptionLogged(option.name) || selectedOption === index;
                const isExercise = selectedMeal === 'exercise';
                const isBlockedByOtherSelection = isExercise 
                  ? (hasLoggedActivityInSlot && !logged) 
                  : (selectedOption !== null || hasLoggedMealInSlot);
                return (
                  <Col md={6} key={`${option.name}-${index}`}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between gap-2">
                          {isExercise ? (
                            <FaDumbbell className="text-primary fs-5" />
                          ) : (
                            <FaUtensils className="text-success" />
                          )}
                          <Badge bg={isExercise ? 'primary' : 'success'}>
                            {isExercise
                              ? t('plannerPage.caloriesBurned', { calories: option.caloriesBurned || option.calories })
                              : `${option.calories} kcal`}
                          </Badge>
                        </div>
                        <h3 className="h5 fw-bold mt-3">{option.name}</h3>
                        <p className="text-secondary">{option.amount}</p>
                        
                        {!isExercise && (
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{option.proteinG}g</strong></span>
                            <span>{t('common.carbs')}<strong>{option.carbsG}g</strong></span>
                            <span>{t('common.fat')}<strong>{option.fatG}g</strong></span>
                          </div>
                        )}
                        
                        <Button
                          className="mt-auto"
                          variant={logged ? (isExercise ? 'primary' : 'success') : (isExercise ? 'outline-primary' : 'outline-success')}
                          disabled={saving || logged || isBlockedByOtherSelection}
                          onClick={() => {
                            if (isExercise) {
                              handleLogActivity(option, index);
                            } else {
                              addOption(option, index);
                            }
                          }}
                        >
                          {logged ? (
                            <>
                              <FaCheck className="me-2" />
                              {t('plannerPage.selected')}
                            </>
                          ) : (
                            isExercise ? t('plannerPage.chooseActivity') : t('plannerPage.chooseOption')
                          )}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Gợi ý vận động - luôn hiện bên dưới bữa ăn */}
            {selectedMeal !== 'exercise' && (
              <div className="mt-5 border-top pt-4">
                <h3 className="h5 fw-bold mb-1 d-flex align-items-center gap-2">
                  <FaDumbbell className="text-primary" />
                  {t('plannerPage.activitySuggestionsTitle')}
                </h3>
                <p className="text-secondary small mb-4">{t('plannerPage.activitySuggestionsDescription')}</p>

                {/* Hoạt động đã ghi nhận */}
                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                    <Card.Body>
                      <h4 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                        <FaCheck className="me-2" />
                        {t('plannerPage.loggedActivitiesTitle')}
                      </h4>
                      <Row className="g-3">
                        {activities.map((act) => (
                          <Col md={6} key={act.id}>
                            <Card className="border-0 shadow-sm bg-white h-100">
                              <Card.Body className="d-flex flex-column p-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-bold text-dark">{act.activityName}</span>
                                  <Badge bg="primary">{Math.round(act.caloriesBurned)} kcal</Badge>
                                </div>
                                <div className="text-secondary small mb-3">{t('plannerPage.duration', { minutes: act.durationMinutes })}</div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="mt-auto w-100"
                                  disabled={saving}
                                  onClick={() => handleDeleteActivity(act.id)}
                                >
                                  {deletingActivityId === act.id ? t('plannerPage.deleting') : t('plannerPage.deleteActivity')}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* 2 phương án vận động từ suggestion.activities */}
                {suggestion.activities && suggestion.activities.length > 0 && (
                  <Row className="g-3">
                    {suggestion.activities.map((activity, idx) => {
                      const actLogged = activities.some((act) => act.activityName === activity.name);
                      return (
                        <Col md={6} key={`${activity.name}-${idx}`}>
                          <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex flex-column">
                              <div className="d-flex justify-content-between gap-2">
                                <FaDumbbell className="text-primary fs-5" />
                                <Badge bg="primary">{t('plannerPage.caloriesBurned', { calories: activity.caloriesBurned })}</Badge>
                              </div>
                              <h3 className="h5 fw-bold mt-3">{activity.name}</h3>
                              <p className="text-secondary">{t('plannerPage.durationLabel')}: <strong>{t('plannerPage.minutes', { minutes: activity.durationMinutes })}</strong></p>
                              <Button
                                className="mt-auto"
                                variant={actLogged ? 'primary' : 'outline-primary'}
                                disabled={saving || actLogged}
                                onClick={() => handleLogActivity(activity, idx)}
                              >
                                {actLogged ? (
                                  <><FaCheck className="me-2" />{t('plannerPage.logged')}</>
                                ) : (
                                  loggingActivity === idx ? t('plannerPage.logging') : t('plannerPage.logActivity')
                                )}
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}

                {/* Nếu suggestion không có activities, hiển thị nút để chuyển sang exercise slot */}
                {(!suggestion.activities || suggestion.activities.length === 0) && activities.length === 0 && (
                  <Alert variant="light" className="border d-flex align-items-center gap-2">
                    <FaDumbbell className="text-primary" />
                    <span>{t('plannerPage.noActivitySuggestions')}</span>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </Col>
    </Row>
  </>;
}

export default Planner;
