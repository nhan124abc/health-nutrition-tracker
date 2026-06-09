const activityConfig = {
  endpoints: {
    listByDate: '/activities',
    createLog: '/activities',
    deleteById: (id) => `/activities/${id}`,
    listTypes: '/activities/types',
    summary: '/activities/summary',
  },
};

export default activityConfig;
