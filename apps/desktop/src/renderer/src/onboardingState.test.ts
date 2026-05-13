import { describe, expect, it } from 'vitest';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboardingCompletion,
  type OnboardingStorage
} from './onboardingState';

function createMemoryStorage(): OnboardingStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

describe('onboarding state', () => {
  it('starts incomplete when no completion flag exists', () => {
    expect(hasCompletedOnboarding(createMemoryStorage())).toBe(false);
  });

  it('persists and reads onboarding completion', () => {
    const storage = createMemoryStorage();

    expect(markOnboardingCompleted(storage)).toBe(true);
    expect(hasCompletedOnboarding(storage)).toBe(true);
  });

  it('resets onboarding completion', () => {
    const storage = createMemoryStorage();

    markOnboardingCompleted(storage);
    expect(resetOnboardingCompletion(storage)).toBe(true);

    expect(hasCompletedOnboarding(storage)).toBe(false);
  });

  it('fails safely when local storage is unavailable', () => {
    expect(hasCompletedOnboarding(null)).toBe(false);
    expect(markOnboardingCompleted(null)).toBe(false);
    expect(resetOnboardingCompletion(null)).toBe(false);
  });
});
