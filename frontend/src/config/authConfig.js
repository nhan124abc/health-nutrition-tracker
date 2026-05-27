const authConfig = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1',
  disableAuth: process.env.REACT_APP_DISABLE_AUTH === 'true',

  tokenKeys: {
    access: 'accessToken',
    refresh: 'refreshToken',
    legacy: 'jwtToken',
  },
  userKey: 'authUser',

  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/password/forgot',
    resetPassword: '/auth/password/reset',
    me: '/auth/me',
    profile: '/users/me/profile',
    aiChat: '/ai/chat',
    oauthAuthorize: (provider) => `/auth/oauth2/authorize/${provider}`,
  },
};

export default authConfig;
