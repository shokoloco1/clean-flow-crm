import { z } from "zod";

// Lista de contraseñas más comunes/filtradas (Top 100)
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

// Patrones débiles comunes
const WEAK_PATTERNS = [
  /^(.)\1+$/, // Caracteres repetidos: "aaaaaa"
  /^(012|123|234|345|456|567|678|789|890)+$/, // Secuencias numéricas
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Secuencias alfabéticas
  /^(qwerty|asdfgh|zxcvbn|qwertyuiop|asdfghjkl|zxcvbnm)+$/i, // Patrones de teclado
  /^(.+)\1+$/, // Patrones repetitivos
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
  score: number;
}

/**
 * Valida si una contraseña está en la lista de contraseñas filtradas/comunes
 */
export function isPasswordBreached(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Detecta patrones débiles en la contraseña
 */
export function hasWeakPattern(password: string): boolean {
  return WEAK_PATTERNS.some(pattern => pattern.test(password));
}

/**
 * Calcula la fortaleza de la contraseña
 */
export function calculatePasswordStrength(password: string): { score: number; strength: "weak" | "medium" | "strong" } {
  let score = 0;
  
  // Longitud base
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Complejidad
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;
  
  // Penalizaciones
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
 * Esquema de validación para contraseñas seguras
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede exceder 128 caracteres")
  .refine(
    (password) => /[a-z]/.test(password),
    "Debe incluir al menos una letra minúscula"
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    "Debe incluir al menos una letra mayúscula"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "Debe incluir al menos un número"
  )
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    "Debe incluir al menos un carácter especial (!@#$%^&*)"
  )
  .refine(
    (password) => !isPasswordBreached(password),
    "Esta contraseña es muy común y ha sido filtrada. Elige una más segura"
  )
  .refine(
    (password) => !hasWeakPattern(password),
    "La contraseña contiene un patrón muy predecible"
  );

/**
 * Esquema de validación para email
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es requerido")
  .email("Ingresa un email válido")
  .max(255, "El email es demasiado largo");

/**
 * Esquema de validación para nombre completo
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(100, "El nombre no puede exceder 100 caracteres")
  .refine(
    (name) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(name),
    "El nombre solo puede contener letras, espacios, guiones y apóstrofes"
  );

/**
 * Esquema completo para signup
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(["admin", "staff"], {
    errorMap: () => ({ message: "Selecciona un tipo de cuenta válido" })
  })
});

/**
 * Esquema para login (menos estricto en contraseña)
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es requerida")
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Valida una contraseña y retorna resultado detallado
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Una minúscula");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Una mayúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Un número");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Un carácter especial");
  }
  if (isPasswordBreached(password)) {
    errors.push("Contraseña filtrada");
  }
  if (hasWeakPattern(password)) {
    errors.push("Patrón débil");
  }
  
  const { score, strength } = calculatePasswordStrength(password);
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}
