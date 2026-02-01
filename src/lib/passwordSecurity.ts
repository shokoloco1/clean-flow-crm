import { z } from "zod";

// List of most common/leaked passwords (Top 100)
const COMMON_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789",
  "12345", "1234", "111111", "1234567", "dragon",
  "123123", "baseball", "iloveyou", "trustno1", "sunshine",
  "master", "welcome", "shadow", "ashley", "football",
  "jesus", "michael", "ninja", "mustang", "password1",
  "123456a", "password123", "admin", "letmein", "welcome1",
  "monkey", "login", "abc123", "starwars", "123123123",
  "654321", "superman", "qwerty123", "michael1", "princess",
  "1qaz2wsx", "1234567890", "hello", "freedom", "whatever",
  "qazwsx", "trustno01", "000000", "master1", "1q2w3e4r",
  "zaq1zaq1", "qwerty1", "q1w2e3r4", "123qwe", "killer",
  "charlie", "donald", "jordan", "andrew", "jennifer",
  "soccer", "hockey", "ranger", "buster", "hunter",
  "thomas", "robert", "pepper", "ginger", "joshua",
  "maggie", "lovely", "nicole", "daniel", "banana",
  "qwe123", "asdfgh", "zxcvbn", "passw0rd", "loveme",
  "football1", "password12", "secret", "pass123", "admin123",
  "root", "toor", "test", "guest", "access",
  "flower", "hello1", "biteme", "summer", "cookie",
  "harley", "george", "bailey", "junior", "batman"
]);

// Common weak patterns
const WEAK_PATTERNS = [
  /^(.)\1+$/, // Repeated characters: "aaaaaa"
  /^(012|123|234|345|456|567|678|789|890)+$/, // Numeric sequences
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Alphabetic sequences
  /^(qwerty|asdfgh|zxcvbn|qwertyuiop|asdfghjkl|zxcvbnm)+$/i, // Keyboard patterns
  /^(.+)\1+$/, // Repetitive patterns
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
  score: number;
}

/**
 * Checks if password is in the list of leaked/common passwords
 */
export function isPasswordBreached(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Detects weak patterns in the password
 */
export function hasWeakPattern(password: string): boolean {
  return WEAK_PATTERNS.some(pattern => pattern.test(password));
}

/**
 * Calculates password strength
 */
export function calculatePasswordStrength(password: string): { score: number; strength: "weak" | "medium" | "strong" } {
  let score = 0;

  // Base length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Complexity
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;

  // Penalties
  if (isPasswordBreached(password)) score -= 5;
  if (hasWeakPattern(password)) score -= 3;

  score = Math.max(0, Math.min(10, score));

  let strength: "weak" | "medium" | "strong";
  if (score <= 3) strength = "weak";
  else if (score <= 6) strength = "medium";
  else strength = "strong";

  return { score, strength };
}

/**
 * Validation schema for secure passwords
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .refine(
    (password) => /[a-z]/.test(password),
    "Must include at least one lowercase letter"
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    "Must include at least one uppercase letter"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "Must include at least one number"
  )
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    "Must include at least one special character (!@#$%^&*)"
  )
  .refine(
    (password) => !isPasswordBreached(password),
    "This password is too common and has been leaked. Choose a more secure one"
  )
  .refine(
    (password) => !hasWeakPattern(password),
    "Password contains a predictable pattern"
  );

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(255, "Email is too long");

/**
 * Full name validation schema
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters")
  .refine(
    (name) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(name),
    "Name can only contain letters, spaces, hyphens and apostrophes"
  );

/**
 * Complete signup schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(["admin", "staff"], {
    errorMap: () => ({ message: "Select a valid account type" })
  })
});

/**
 * Login schema (less strict on password)
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Validates a password and returns detailed result
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Minimum 8 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("One special character");
  }
  if (isPasswordBreached(password)) {
    errors.push("Leaked password");
  }
  if (hasWeakPattern(password)) {
    errors.push("Weak pattern");
  }

  const { score, strength } = calculatePasswordStrength(password);

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}
