const nutritionConfig = {
  endpoints: {
    foods: '/nutrition/foods',
    foodDetail: (id) => `/nutrition/foods/${id}`,
    categories: '/nutrition/categories',
    recipeSuggestions: '/nutrition/recipes/suggestions',
  },
};

export default nutritionConfig;
