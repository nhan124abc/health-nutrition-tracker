const nutritionConfig = {
  endpoints: {
    foods: '/nutrition/foods',
    foodDetail: (id) => `/nutrition/foods/${id}`,
    categories: '/nutrition/categories',
    adminCategories: '/nutrition/admin/categories',
    adminCategoryDetail: (id) => `/nutrition/admin/categories/${id}`,
    adminCategoryHide: (id) => `/nutrition/admin/categories/${id}/hide`,
    adminCategoryRestore: (id) => `/nutrition/admin/categories/${id}/restore`,
    recipeSuggestions: '/nutrition/recipes/suggestions',
    recipes: '/nutrition/recipes',
  },
};

export default nutritionConfig;
