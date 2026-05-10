import { describe, expect, it } from 'vitest';
import { calculateMbsScore } from './index';

describe('calculateMbsScore', () => {
  it('returns the placeholder score', () => {
    expect(calculateMbsScore()).toBe(0);
  });
});
