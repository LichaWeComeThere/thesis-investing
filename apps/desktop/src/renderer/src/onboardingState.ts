const ONBOARDING_COMPLETED_KEY = 'thesis-investing:onboarding-completed';
const ONBOARDING_COMPLETED_VALUE = 'true';

export type OnboardingStorage = Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
>;

function getDefaultOnboardingStorage(): OnboardingStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasCompletedOnboarding(
  storage: OnboardingStorage | null = getDefaultOnboardingStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(ONBOARDING_COMPLETED_KEY) === ONBOARDING_COMPLETED_VALUE;
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(
  storage: OnboardingStorage | null = getDefaultOnboardingStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(ONBOARDING_COMPLETED_KEY, ONBOARDING_COMPLETED_VALUE);
    return true;
  } catch {
    return false;
  }
}

export function resetOnboardingCompletion(
  storage: OnboardingStorage | null = getDefaultOnboardingStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(ONBOARDING_COMPLETED_KEY);
    return true;
  } catch {
    return false;
  }
}
