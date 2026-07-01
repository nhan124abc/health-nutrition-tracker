const analyticsConfig = {
  endpoints: {
    insights: '/analytics/insights',
    insightRead: (id) => `/analytics/insights/${id}/read`,
  },
};

export default analyticsConfig;
