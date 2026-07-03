const analyticsConfig = {
  endpoints: {
    insights: '/analytics/insights',
    insightRead: (id) => `/analytics/insights/${id}/read`,
    daily: '/analytics/daily',
    weekly: '/analytics/weekly',
    monthly: '/analytics/monthly',
  },
};

export default analyticsConfig;
