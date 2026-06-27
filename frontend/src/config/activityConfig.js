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
    adminTypes: '/activities/admin/types',
    adminTypeDetail: (id) => `/activities/admin/types/${id}`,
    adminTypeHide: (id) => `/activities/admin/types/${id}/hide`,
    adminTypeRestore: (id) => `/activities/admin/types/${id}/restore`,
    summary: '/activities/summary',
  },
};

export default activityConfig;
