const nutritionConfig = {
  endpoints: {
    foods: '/nutrition/foods',
    foodDetail: (id) => `/nutrition/foods/${id}`,
    categories: '/nutrition/categories',
  },
};

export default nutritionConfig;
