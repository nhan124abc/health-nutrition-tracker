const authConfig = {
  apiBaseUrl:
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    'http://localhost:8080/api/v1',

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
    verifyPasswordResetOtp: '/auth/password/verify-otp',
    resetPassword: '/auth/password/reset',
    sendEmailVerification: '/auth/email/verification/send',
    confirmEmailVerification: '/auth/email/verification/confirm',
    me: '/auth/me',
    oauthAuthorize: (provider) => `/auth/oauth2/authorize/${provider}`,
  },
};

export default authConfig;
