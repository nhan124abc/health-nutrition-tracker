const waterConfig = {
  endpoints: {
    createLog: '/users/me/water',
    updateById: (id) => `/users/me/water/${id}`,
    deleteById: (id) => `/users/me/water/${id}`,
    logs: '/users/me/water',
    today: '/users/me/water/today',
  },
};

export default waterConfig;
