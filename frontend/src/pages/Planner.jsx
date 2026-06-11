import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { FaCheck, FaRobot, FaUtensils, FaDumbbell } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { getAiPlanSuggestions } from '../features/ai/aiService';
import { createMeal, getMealsByDate, deleteMealById } from '../features/meals/mealService';
import { extractMealsFromApi, getMealsTotals, normalizeMealFromApi } from '../features/meals/mealUtils';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';
import { getActivitiesByDate, createActivityLog, deleteActivityById } from '../features/activities/activityService';

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function Planner() {
  const { t } = useTranslation();

  const mealTypes = [
    ['breakfast', t('planner.mealTypes.breakfast')],
    ['lunch', t('planner.mealTypes.lunch')],
    ['dinner', t('planner.mealTypes.dinner')],
    ['afternoon_snack', t('planner.mealTypes.afternoon_snack')],
    ['exercise', t('planner.mealTypes.exercise')],
  ];

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
      .catch((err) => setError(err.response?.data?.message || t('planner.errorLoad')))
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
      setError(err.response?.data?.message || t('planner.errorGenerate'));
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
        throw new Error(t('planner.overLimitError'));
      }
      const payload = {
        mealType: selectedMeal.toUpperCase(),
        mealDate: today(),
        mealTime: null,
        notes: t('planner.badge'),
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
      setSuccess(t('planner.successAdd', { name: option.name }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('planner.errorAdd'));
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
      setSuccess(t('planner.successDeleteMeal'));
    } catch (err) {
      setError(err.response?.data?.message || t('planner.errorDelete'));
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
      notes: t('planner.badge'),
      category: 'CARDIO',
    };
    try {
      const response = await createActivityLog(payload);
      setActivities((current) => [...current, response.data]);
      setSelectedOption(idx);
      setSuccess(t('planner.successLogActivity', { name: activity.name }));
    } catch (err) {
      setError(err.response?.data?.message || t('planner.errorLogActivity'));
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
      setSuccess(t('planner.successDeleteActivity'));
    } catch (err) {
      setError(err.response?.data?.message || t('planner.errorDeleteActivity'));
    } finally {
      setSaving(false);
      setDeletingActivityId(null);
    }
  };

  if (loading) return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;

  const isExerciseSlot = selectedMeal === 'exercise';
  const slotLabel = mealTypes.find(([k]) => k === selectedMeal)?.[1] || '';

  return <>
    <div className="page-heading"><div>
      <Badge bg="success" className="mb-2">{t('planner.badge')}</Badge>
      <h1>{t('planner.pageTitle')}</h1>
      <p>{t('planner.pageSubtitle')}</p>
    </div></div>

    {error && <Alert variant="danger">{error}</Alert>}
    {success && <Alert variant="success">{success}</Alert>}

    <Row className="g-4">
      {/* ── Left Panel ── */}
      <Col lg={4}>
        <Card className="border-0 shadow-sm"><Card.Body>
          <h2 className="h5 fw-bold">{t('planner.calorieBudgetTitle')}</h2>
          <div className="display-6 fw-bold text-success">{remaining} kcal</div>
          <p className="text-secondary">{t('planner.eaten', { consumed: totals.calories, goal: calorieGoal })}</p>
          <ProgressBar now={Math.min(progress, 100)} variant={progress > 100 ? 'danger' : 'success'} className="mb-4" />

          <Form.Group className="mb-3">
            <Form.Label>{t('planner.selectSlotLabel')}</Form.Label>
            <Form.Select value={selectedMeal} onChange={(e) => { setSelectedMeal(e.target.value); setSuggestion(null); setSelectedOption(null); }}>
              {mealTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </Form.Select>
          </Form.Group>

          <Button
            className="w-100"
            variant={isExerciseSlot ? 'primary' : 'success'}
            onClick={generate}
            disabled={generating || (!isExerciseSlot && remaining < 100 && !hasInvalidDailyTotal)}
          >
            <FaRobot className="me-2" />{generating ? t('planner.generating') : t('planner.generate')}
          </Button>

          {suggestion && (
            <Button
              className="w-100 mt-2"
              variant={isExerciseSlot ? 'outline-primary' : 'outline-success'}
              onClick={generate}
              disabled={generating}
            >
              <FaRobot className="me-2" />{t('planner.generateMore')}
            </Button>
          )}

          {hasInvalidDailyTotal && (
            <Alert variant="danger" className="mt-3 mb-0 py-2">{t('planner.invalidTotalWarning')}</Alert>
          )}
          {!hasInvalidDailyTotal && !isExerciseSlot && remaining < 100 && (
            <Alert variant="warning" className="mt-3 mb-0 py-2">{t('planner.overCalorieWarning')}</Alert>
          )}
        </Card.Body></Card>
      </Col>

      {/* ── Right Panel ── */}
      <Col lg={8}>
        {/* Logged meals (non-exercise slots) */}
        {!isExerciseSlot && loggedMealsForSlot.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-success bg-opacity-10 border border-success border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-success mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('planner.loggedMealsTitle', { slot: slotLabel.toLowerCase() })}
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
                          <div className="text-secondary small mb-3">{t('planner.serving', { amount: item.serving })}</div>
                          <div className="quick-grid mb-3">
                            <span>Protein<strong>{item.protein}g</strong></span>
                            <span>Carbs<strong>{item.carbs}g</strong></span>
                            <span>Fat<strong>{item.fat}g</strong></span>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="mt-auto w-100"
                            disabled={saving}
                            onClick={() => deleteMeal(meal.id)}
                          >
                            {deletingId === meal.id ? t('planner.deleting') : t('planner.cancelMeal')}
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

        {/* Logged activities (exercise slot) */}
        {isExerciseSlot && activities.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('planner.loggedActivitiesTitle')}
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
                        <div className="text-secondary small mb-3">
                          {t('planner.duration', { minutes: act.durationMinutes })}
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="mt-auto w-100"
                          disabled={saving}
                          onClick={() => handleDeleteActivity(act.id)}
                        >
                          {deletingActivityId === act.id ? t('planner.deleting') : t('planner.cancelActivity')}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Empty state hint */}
        {!suggestion && !generating && (
          <Alert variant="light" className="border">
            {isExerciseSlot
              ? (activities.length > 0 ? t('planner.hintWithActivityLog') : t('planner.hintExerciseEmpty'))
              : (loggedMealsForSlot.length > 0 ? t('planner.hintWithLog', { slot: slotLabel.toLowerCase() }) : t('planner.hintEmpty'))
            }
          </Alert>
        )}

        {/* Generating spinner */}
        {generating && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-5 text-center">
              <Spinner animation="grow" variant={isExerciseSlot ? 'primary' : 'success'} />
              <p className="mt-3 mb-0">{t('planner.generatingHint')}</p>
            </Card.Body>
          </Card>
        )}

        {/* Suggestion cards */}
        {suggestion && (
          <>
            <Alert variant={isExerciseSlot ? 'primary' : 'info'}>
              {isExerciseSlot
                ? suggestion.message
                : `${suggestion.message} ${t('planner.mealBudget', { budget: suggestion.mealBudget })}`
              }
            </Alert>

            <Row className="g-3">
              {(suggestion.options || []).map((option, index) => {
                const logged = isOptionLogged(option.name) || selectedOption === index;
                const isBlockedByOtherSelection = isExerciseSlot
                  ? (hasLoggedActivityInSlot && !logged)
                  : (selectedOption !== null || hasLoggedMealInSlot);
                return (
                  <Col md={6} key={`${option.name}-${index}`}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between gap-2">
                          {isExerciseSlot
                            ? <FaDumbbell className="text-primary fs-5" />
                            : <FaUtensils className="text-success" />
                          }
                          <Badge bg={isExerciseSlot ? 'primary' : 'success'}>
                            {isExerciseSlot
                              ? t('planner.caloriesBurned', { calories: option.caloriesBurned || option.calories })
                              : `${option.calories} kcal`
                            }
                          </Badge>
                        </div>
                        <h3 className="h5 fw-bold mt-3">{option.name}</h3>
                        <p className="text-secondary">{option.amount}</p>

                        {!isExerciseSlot && (
                          <div className="quick-grid mb-3">
                            <span>Protein<strong>{option.proteinG}g</strong></span>
                            <span>Carbs<strong>{option.carbsG}g</strong></span>
                            <span>Fat<strong>{option.fatG}g</strong></span>
                          </div>
                        )}

                        <Button
                          className="mt-auto"
                          variant={logged
                            ? (isExerciseSlot ? 'primary' : 'success')
                            : (isExerciseSlot ? 'outline-primary' : 'outline-success')
                          }
                          disabled={saving || logged || isBlockedByOtherSelection}
                          onClick={() => isExerciseSlot ? handleLogActivity(option, index) : addOption(option, index)}
                        >
                          {logged ? (
                            <><FaCheck className="me-2" />{t('planner.chosen')}</>
                          ) : (
                            isExerciseSlot ? t('planner.chooseActivity') : t('planner.chooseOption')
                          )}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Activity suggestions section (shown below meal options) */}
            {!isExerciseSlot && (
              <div className="mt-5 border-top pt-4">
                <h3 className="h5 fw-bold mb-1 d-flex align-items-center gap-2">
                  <FaDumbbell className="text-primary" />
                  {t('planner.activitySectionTitle')}
                </h3>
                <p className="text-secondary small mb-4">{t('planner.activitySectionSubtitle')}</p>

                {/* Already logged activities */}
                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                    <Card.Body>
                      <h4 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                        <FaCheck className="me-2" />
                        {t('planner.activityLoggedTitle')}
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
                                <div className="text-secondary small mb-3">
                                  {t('planner.duration', { minutes: act.durationMinutes })}
                                </div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="mt-auto w-100"
                                  disabled={saving}
                                  onClick={() => handleDeleteActivity(act.id)}
                                >
                                  {deletingActivityId === act.id ? t('planner.deleting') : t('planner.deleteActivity')}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* Suggested activities from suggestion.activities */}
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
                                <Badge bg="primary">
                                  {t('planner.caloriesBurned', { calories: activity.caloriesBurned })}
                                </Badge>
                              </div>
                              <h3 className="h5 fw-bold mt-3">{activity.name}</h3>
                              <p className="text-secondary">
                                {t('planner.duration', { minutes: activity.durationMinutes })}
                              </p>
                              <Button
                                className="mt-auto"
                                variant={actLogged ? 'primary' : 'outline-primary'}
                                disabled={saving || actLogged}
                                onClick={() => handleLogActivity(activity, idx)}
                              >
                                {actLogged
                                  ? <><FaCheck className="me-2" />{t('planner.activityLogged')}</>
                                  : t('planner.logActivity')
                                }
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}

                {/* Hint when no activities yet */}
                {(!suggestion.activities || suggestion.activities.length === 0) && activities.length === 0 && (
                  <Alert variant="light" className="border d-flex align-items-center gap-2">
                    <FaDumbbell className="text-primary" />
                    <span dangerouslySetInnerHTML={{ __html: t('planner.activityHint') }} />
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
