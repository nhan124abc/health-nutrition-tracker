import { getProfile, updateProfile } from '../features/profile/profileService';

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

export async function fillMissingProfileFromGuestSession() {
  const guest = readGuestProfile();
  if (!guest) return false;

  const response = await getProfile();
  const current = response.data?.data || response.data || {};
  const payload = {};
  const age = Number(guest.age);

  if (!current.dateOfBirth && age > 0) {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);
    payload.dateOfBirth = birthDate.toISOString().slice(0, 10);
  }
  if (!current.gender && guest.gender) payload.gender = guest.gender;
  if (!current.heightCm && Number(guest.heightCm) > 0) payload.heightCm = Number(guest.heightCm);
  if (!current.weightKg && Number(guest.weightKg) > 0) payload.weightKg = Number(guest.weightKg);
  if (!current.activityLevel && guest.activityLevel) payload.activityLevel = guest.activityLevel;
  if (!current.goal && guest.goal) payload.goal = guest.goal;

  if (Object.keys(payload).length > 0) await updateProfile(payload);
  sessionStorage.removeItem(GUEST_PROFILE_KEY);
  return Object.keys(payload).length > 0;
}
