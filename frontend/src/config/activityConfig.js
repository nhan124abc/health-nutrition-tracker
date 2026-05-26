const activityConfig = {
  endpoints: {
    listByDate: '/activities',
    createLog: '/activities',
    getById: (id) => `/activities/${id}`,
    deleteById: (id) => `/activities/${id}`,

    listTypes: '/activities/types',

    createPlan: '/activities/plans',
    listPlans: '/activities/plans',

    getStepsByDate: '/activities/steps',
    createStepsLog: '/activities/steps',
  },
};

export default activityConfig;
