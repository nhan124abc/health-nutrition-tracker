const activityConfig = {
  endpoints: {
    listByDate: '/activities',
    createLog: '/activities',
    updateById: (id) => `/activities/${id}`,
    deleteById: (id) => `/activities/${id}`,
    listTypes: '/activities/types',
    summary: '/activities/summary',
  },
};

export default activityConfig;
