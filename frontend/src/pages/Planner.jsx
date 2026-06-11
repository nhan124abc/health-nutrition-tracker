import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
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
  ['breakfast', 'Bữa sáng'],
  ['lunch', 'Bữa trưa'],
  ['dinner', 'Bữa tối'],
  ['afternoon_snack', 'Bữa phụ'],
  ['exercise', 'Hoạt động vận động'],
];

function Planner() {
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
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải dữ liệu hôm nay.'))
      .finally(() => setLoading(false));
  }, []);

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
      setError(err.response?.data?.message || 'Không thể tạo gợi ý.');
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
        throw new Error('Phương án vượt quá lượng calo còn lại. Vui lòng tạo lại gợi ý.');
      }

      // AI đã trả tổng dinh dưỡng cho toàn bộ phần ăn. Gửi thẳng sang Meal API,
      // không quy đổi thêm theo servingSizeG để tránh nhân calories hai lần.
      const payload = {
        mealType: selectedMeal.toUpperCase(),
        mealDate: today(),
        mealTime: null,
        notes: 'Bữa ăn đề xuất theo lượng calo còn lại',
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
      setSuccess(`Đã thêm "${option.name}". Phương án còn lại sẽ không được cộng thêm.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể thêm bữa ăn vào nhật ký.');
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
      setSuccess('Đã hủy chọn và xóa bữa ăn khỏi nhật ký.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa bữa ăn.');
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
      notes: 'Bài tập đề xuất từ AI Planner',
      category: 'CARDIO',
    };

    try {
      const response = await createActivityLog(payload);
      setActivities((current) => [...current, response.data]);
      setSelectedOption(idx);
      setSuccess(`Đã ghi nhận bài tập "${activity.name}".`);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể ghi nhận hoạt động.');
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
      setSuccess('Đã xóa hoạt động khỏi nhật ký.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa hoạt động.');
    } finally {
      setSaving(false);
      setDeletingActivityId(null);
    }
  };

  if (loading) return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;

  return <>
    <div className="page-heading"><div><Badge bg="success" className="mb-2">Gợi ý theo calo còn lại</Badge><h1>Chọn bữa ăn phù hợp</h1><p>Hệ thống tạo hai phương án thay thế nhau dựa trên lượng calo bạn còn được ăn hôm nay.</p></div></div>
    {error && <Alert variant="danger">{error}</Alert>}
    {success && <Alert variant="success">{success}</Alert>}
    <Row className="g-4">
      <Col lg={4}>
        <Card className="border-0 shadow-sm"><Card.Body>
          <h2 className="h5 fw-bold">Ngân sách calo hôm nay</h2>
          <div className="display-6 fw-bold text-success">{remaining} kcal</div>
          <p className="text-secondary">Đã ăn {totals.calories} / {calorieGoal} kcal</p>
          <ProgressBar now={Math.min(progress, 100)} variant={progress > 100 ? 'danger' : 'success'} className="mb-4" />
          <Form.Group className="mb-3"><Form.Label>Chọn bữa ăn hoặc hoạt động</Form.Label><Form.Select value={selectedMeal} onChange={(e) => { setSelectedMeal(e.target.value); setSuggestion(null); setSelectedOption(null); }}>
            {mealTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </Form.Select></Form.Group>
          <Button className="w-100" variant={selectedMeal === 'exercise' ? 'primary' : 'success'} onClick={generate} disabled={generating || (selectedMeal !== 'exercise' && remaining < 100 && !hasInvalidDailyTotal)}><FaRobot className="me-2" />{generating ? 'Đang tạo...' : 'Tạo 2 phương án'}</Button>
          {suggestion && <Button className="w-100 mt-2" variant={selectedMeal === 'exercise' ? 'outline-primary' : 'outline-success'} onClick={generate} disabled={generating}><FaRobot className="me-2" />Tạo 2 phương án khác</Button>}
          {hasInvalidDailyTotal && <Alert variant="danger" className="mt-3 mb-0 py-2">Tổng calo hiện tại bất thường do dữ liệu bữa cũ. Gợi ý mới sẽ bỏ qua tổng này; bạn nên xóa các bữa bị sai.</Alert>}
          {!hasInvalidDailyTotal && selectedMeal !== 'exercise' && remaining < 100 && <Alert variant="warning" className="mt-3 mb-0 py-2">Không còn đủ calo cho một bữa mới.</Alert>}
        </Card.Body></Card>
      </Col>
      <Col lg={8}>
        {selectedMeal !== 'exercise' && loggedMealsForSlot.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-success bg-opacity-10 border border-success border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-success mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                Món ăn đã ghi nhận cho {mealTypes.find(([k]) => k === selectedMeal)?.[1].toLowerCase()} hôm nay:
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
                          <div className="text-secondary small mb-3">Định lượng: {item.serving}</div>
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
                            {deletingId === meal.id ? 'Đang xóa...' : 'Hủy chọn bữa này'}
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
                Hoạt động vận động đã ghi nhận hôm nay:
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
                        <div className="text-secondary small mb-3">Thời lượng: {act.durationMinutes} phút</div>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          className="mt-auto w-100"
                          disabled={saving}
                          onClick={() => handleDeleteActivity(act.id)}
                        >
                          {deletingActivityId === act.id ? 'Đang xóa...' : 'Hủy chọn hoạt động này'}
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
                ? 'Bạn đã ghi nhận hoạt động vận động hôm nay. Nhấn "Tạo 2 phương án khác" nếu muốn thay đổi.'
                : 'Chọn loại hoạt động vận động rồi nhấn “Tạo 2 phương án”.'
            ) : (
              loggedMealsForSlot.length > 0 
                ? `Bạn đã ghi nhận món ăn cho ${mealTypes.find(([k]) => k === selectedMeal)?.[1].toLowerCase()} hôm nay. Nhấn "Tạo 2 phương án khác" nếu muốn thay đổi.` 
                : `Chọn loại bữa rồi nhấn “Tạo 2 phương án”.`
            )}
          </Alert>
        )}

        {generating && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-5 text-center">
              <Spinner animation="grow" variant={selectedMeal === 'exercise' ? 'primary' : 'success'} />
              <p className="mt-3 mb-0">Đang tìm phương án phù hợp nhất cho bạn...</p>
            </Card.Body>
          </Card>
        )}

        {suggestion && (
          <>
            {selectedMeal === 'exercise' ? (
              <Alert variant="primary">
                {suggestion.message}
              </Alert>
            ) : (
              <Alert variant="info">
                {suggestion.message} Ngân sách cho bữa này: <strong>{suggestion.mealBudget} kcal</strong>.
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
                            {isExercise ? `Đốt ${option.caloriesBurned || option.calories} kcal` : `${option.calories} kcal`}
                          </Badge>
                        </div>
                        <h3 className="h5 fw-bold mt-3">{option.name}</h3>
                        <p className="text-secondary">{option.amount}</p>
                        
                        {!isExercise && (
                          <div className="quick-grid mb-3">
                            <span>Protein<strong>{option.proteinG}g</strong></span>
                            <span>Carbs<strong>{option.carbsG}g</strong></span>
                            <span>Fat<strong>{option.fatG}g</strong></span>
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
                              Đã chọn
                            </>
                          ) : (
                            isExercise ? 'Chọn hoạt động này' : 'Chọn phương án này'
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
                  Gợi ý hoạt động vận động hôm nay
                </h3>
                <p className="text-secondary small mb-4">Kết hợp tập luyện giúp bạn đạt mục tiêu nhanh hơn.</p>

                {/* Hoạt động đã ghi nhận */}
                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                    <Card.Body>
                      <h4 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                        <FaCheck className="me-2" />
                        Hoạt động đã ghi nhận hôm nay:
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
                                <div className="text-secondary small mb-3">Thời lượng: {act.durationMinutes} phút</div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="mt-auto w-100"
                                  disabled={saving}
                                  onClick={() => handleDeleteActivity(act.id)}
                                >
                                  {deletingActivityId === act.id ? 'Đang xóa...' : 'Xóa hoạt động'}
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
                                <Badge bg="primary">{activity.caloriesBurned} kcal đốt</Badge>
                              </div>
                              <h3 className="h5 fw-bold mt-3">{activity.name}</h3>
                              <p className="text-secondary">Thời lượng: <strong>{activity.durationMinutes} phút</strong></p>
                              <Button
                                className="mt-auto"
                                variant={actLogged ? 'primary' : 'outline-primary'}
                                disabled={saving || actLogged}
                                onClick={() => handleLogActivity(activity, idx)}
                              >
                                {actLogged ? (
                                  <><FaCheck className="me-2" />Đã ghi nhận</>
                                ) : (
                                  'Ghi nhận bài tập'
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
                    <span>Chọn <strong>Hoạt động vận động</strong> trong dropdown và nhấn &quot;Tạo 2 phương án&quot; để nhận gợi ý bài tập.</span>
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
