const profileConfig = {
  endpoints: {
    profile: '/users/me/profile',
    bodyMetrics: '/users/me/metrics',
    goalSuggestions: '/users/me/goal-plans/suggestions',
    guestGoalSuggestions: process.env.REACT_APP_GUEST_GOAL_SUGGESTIONS_ENDPOINT || '/goal-plans/suggestions',
    applyGoal: '/users/me/goal-plans/apply',
  },
};

export default profileConfig;
