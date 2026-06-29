const activityConfig = {
  endpoints: {
    listByDate: '/activities',
    createLog: '/activities',
    updateById: (id) => `/activities/${id}`,
    deleteById: (id) => `/activities/${id}`,
    workoutPlans: '/activities/workout-plans',
    workoutPlanDetail: (id) => `/activities/workout-plans/${id}`,
    workoutPlanActive: (id) => `/activities/workout-plans/${id}/active`,
    listTypes: '/activities/types',
    adminCategories: '/activities/admin/categories',
    adminCategoryDetail: (category) => `/activities/admin/categories/${category}`,
    adminCategoryHide: (category) => `/activities/admin/categories/${category}/hide`,
    adminCategoryRestore: (category) => `/activities/admin/categories/${category}/restore`,
    adminTypes: '/activities/admin/types',
    adminTypeDetail: (id) => `/activities/admin/types/${id}`,
    adminTypeHide: (id) => `/activities/admin/types/${id}/hide`,
    adminTypeRestore: (id) => `/activities/admin/types/${id}/restore`,
    categories: '/activities/categories',
    summary: '/activities/summary',
  },
};

export default activityConfig;
