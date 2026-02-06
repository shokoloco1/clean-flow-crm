import { describe, it, expect } from 'vitest';
import {
  isPasswordBreached,
  hasWeakPattern,
  calculatePasswordStrength,
  validatePassword,
  passwordSchema,
} from './passwordSecurity';

describe('isPasswordBreached', () => {
  it('should detect common passwords', () => {
    expect(isPasswordBreached('password')).toBe(true);
    expect(isPasswordBreached('123456')).toBe(true);
    expect(isPasswordBreached('qwerty')).toBe(true);
    expect(isPasswordBreached('admin')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isPasswordBreached('PASSWORD')).toBe(true);
    expect(isPasswordBreached('Password')).toBe(true);
    expect(isPasswordBreached('QWERTY')).toBe(true);
  });

  it('should allow secure passwords', () => {
    expect(isPasswordBreached('MySecure$Pass123!')).toBe(false);
    expect(isPasswordBreached('Xk9#mNpQ@2024')).toBe(false);
  });
});

describe('hasWeakPattern', () => {
  it('should detect repeated characters', () => {
    expect(hasWeakPattern('aaaaaaa')).toBe(true);
    expect(hasWeakPattern('1111111')).toBe(true);
  });

  it('should detect numeric sequences', () => {
    // The regex matches 3-digit sequences like 012, 123, etc.
    expect(hasWeakPattern('123123123')).toBe(true);
    expect(hasWeakPattern('012012')).toBe(true);
  });

  it('should detect keyboard patterns', () => {
    expect(hasWeakPattern('qwerty')).toBe(true);
    expect(hasWeakPattern('asdfgh')).toBe(true);
    expect(hasWeakPattern('zxcvbn')).toBe(true);
  });

  it('should allow non-patterned passwords', () => {
    expect(hasWeakPattern('Secure$Pass1!')).toBe(false);
    expect(hasWeakPattern('Random#Word42')).toBe(false);
  });
});

describe('calculatePasswordStrength', () => {
  it('should rate weak passwords', () => {
    const result = calculatePasswordStrength('abc');
    expect(result.strength).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(3);
  });

  it('should rate medium passwords', () => {
    // Use a password that has mixed case and numbers but no special chars
    const result = calculatePasswordStrength('MyPass123abc');
    expect(result.strength).toBe('medium');
    expect(result.score).toBeGreaterThan(3);
    expect(result.score).toBeLessThanOrEqual(6);
  });

  it('should rate strong passwords', () => {
    const result = calculatePasswordStrength('MySecure$Password123!');
    expect(result.strength).toBe('strong');
    expect(result.score).toBeGreaterThan(6);
  });

  it('should penalize breached passwords', () => {
    const breached = calculatePasswordStrength('password');
    const secure = calculatePasswordStrength('xK9mNpQ2');
    expect(breached.score).toBeLessThan(secure.score);
  });

  it('should penalize weak patterns', () => {
    const patterned = calculatePasswordStrength('qwertyuiop');
    const random = calculatePasswordStrength('xK9mNpQ2ab');
    expect(patterned.score).toBeLessThan(random.score);
  });
});

describe('validatePassword', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Short1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Minimum 8 characters');
  });

  it('should require lowercase letters', () => {
    const result = validatePassword('UPPERCASE123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('One lowercase');
  });

  it('should require uppercase letters', () => {
    const result = validatePassword('lowercase123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('One uppercase');
  });

  it('should require numbers', () => {
    const result = validatePassword('NoNumbers!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('One number');
  });

  it('should require special characters', () => {
    const result = validatePassword('NoSpecial123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('One special character');
  });

  it('should reject breached passwords', () => {
    // 'password' is in the common passwords list
    const result = validatePassword('password');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Leaked password');
  });

  it('should accept valid passwords', () => {
    const result = validatePassword('Secure$Password123!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('passwordSchema', () => {
  it('should validate correct passwords', () => {
    const result = passwordSchema.safeParse('Secure$Password123!');
    expect(result.success).toBe(true);
  });

  it('should reject invalid passwords with appropriate errors', () => {
    const result = passwordSchema.safeParse('weak');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('should reject passwords exceeding max length', () => {
    const longPassword = 'A'.repeat(129) + '1!a';
    const result = passwordSchema.safeParse(longPassword);
    expect(result.success).toBe(false);
  });
});
