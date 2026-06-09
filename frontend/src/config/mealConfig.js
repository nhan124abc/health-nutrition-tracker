const mealConfig = {
  endpoints: {
    listByDate: '/meals',
    create: '/meals',
    detail: (id) => `/meals/${id}`,
    update: (id) => `/meals/${id}`,
    deleteById: (id) => `/meals/${id}`,
  },
};

export default mealConfig;
