const adminConfig = {
  endpoints: {
    dashboardOverview: '/analytics/admin/overview',
    users: '/auth/admin/users',
    userDetail: (id) => `/auth/admin/users/${id}`,
    userLock: (id) => `/auth/admin/users/${id}/lock`,
    userUnlock: (id) => `/auth/admin/users/${id}/unlock`,
    systemAnalytics: '/analytics/admin/system-analytics',
  },
};

export default adminConfig;
