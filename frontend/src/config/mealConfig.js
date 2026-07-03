const mealConfig = {
  endpoints: {
    listByDate: '/meals',
    create: '/meals',
    detail: (id) => `/meals/${id}`,
    update: (id) => `/meals/${id}`,
    completion: (id) => `/meals/${id}/completion`,
    deleteById: (id) => `/meals/${id}`,
    mealPlans: '/meals/plans',
    mealPlanDetail: (id) => `/meals/plans/${id}`,
    mealPlanActive: (id) => `/meals/plans/${id}/active`,
  },
};

export default mealConfig;
