import { applyGoalPlan, updateProfile } from '../features/profile/profileService';

export const GUEST_PROFILE_KEY = 'guestProfileData';
export const GUEST_GOAL_PLAN_KEY = 'guestGoalPlan';

export function readGuestProfile() {
  try {
    return JSON.parse(sessionStorage.getItem(GUEST_PROFILE_KEY)) || null;
  } catch {
    sessionStorage.removeItem(GUEST_PROFILE_KEY);
    return null;
  }
}

export function saveGuestProfile(profile) {
  sessionStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
}

export function readGuestGoalPlan() {
  try {
    return JSON.parse(sessionStorage.getItem(GUEST_GOAL_PLAN_KEY)) || null;
  } catch {
    sessionStorage.removeItem(GUEST_GOAL_PLAN_KEY);
    return null;
  }
}

export function clearGuestSession() {
  sessionStorage.removeItem(GUEST_PROFILE_KEY);
  sessionStorage.removeItem(GUEST_GOAL_PLAN_KEY);
}

export async function fillMissingProfileFromGuestSession() {
  const guest = readGuestProfile();
  const guestGoalPlan = readGuestGoalPlan();
  if (!guest && !guestGoalPlan) return false;

  const payload = {};
  const age = Number(guest?.age);

  if (age >= 16) {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);
    payload.dateOfBirth = birthDate.toISOString().slice(0, 10);
  }
  if (guest?.gender) payload.gender = guest.gender;
  if (Number(guest?.heightCm) > 0) payload.heightCm = Number(guest.heightCm);
  if (Number(guest?.weightKg) > 0) payload.weightKg = Number(guest.weightKg);
  if (guest?.activityLevel) payload.activityLevel = guest.activityLevel;
  if (guest?.goal) payload.goal = guest.goal;
  if (Number(guestGoalPlan?.targetWeightKg) > 0) {
    payload.targetWeightKg = Number(guestGoalPlan.targetWeightKg);
  }

  if (Object.keys(payload).length > 0) {
    await updateProfile(payload);
  }

  if (guestGoalPlan?.goal && Number(guestGoalPlan?.targetChangeKg) > 0 && Number(guestGoalPlan?.weeks) > 0) {
    const applied = await applyGoalPlan({
      goal: guestGoalPlan.goal,
      targetChangeKg: Number(guestGoalPlan.targetChangeKg),
      targetWeeks: Number(guestGoalPlan.weeks),
    });
    const appliedPlan = applied.data?.data || applied.data || guestGoalPlan;
    localStorage.setItem('activeGoalPlan', JSON.stringify({
      ...guestGoalPlan,
      ...appliedPlan,
      goal: guestGoalPlan.goal,
      targetWeightKg: guestGoalPlan.targetWeightKg,
    }));
  }

  clearGuestSession();
  return true;
}
