import { z } from "zod";

// ============= FORMATTERS =============

/**
 * Capitalizes the first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats Australian phone number
 * Accepts: 04XX XXX XXX, 0X XXXX XXXX, +61 X XXXX XXXX
 */
export function formatAUPhone(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Handle +61 prefix
  if (digits.startsWith('61') && digits.length > 2) {
    const localDigits = digits.slice(2);
    if (localDigits.startsWith('4')) {
      // Mobile: +61 4XX XXX XXX
      if (localDigits.length <= 3) return `+61 ${localDigits}`;
      if (localDigits.length <= 6) return `+61 ${localDigits.slice(0, 3)} ${localDigits.slice(3)}`;
      return `+61 ${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6, 9)}`;
    } else {
      // Landline: +61 X XXXX XXXX
      if (localDigits.length <= 1) return `+61 ${localDigits}`;
      if (localDigits.length <= 5) return `+61 ${localDigits.slice(0, 1)} ${localDigits.slice(1)}`;
      return `+61 ${localDigits.slice(0, 1)} ${localDigits.slice(1, 5)} ${localDigits.slice(5, 9)}`;
    }
  }
  
  // Handle Australian numbers starting with 0
  if (digits.startsWith('04')) {
    // Mobile: 04XX XXX XXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
  } else if (digits.startsWith('0')) {
    // Landline: 0X XXXX XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  }
  
  // Return as-is if doesn't match patterns
  return digits;
}

/**
 * Formats Australian Business Number (ABN)
 * Format: XX XXX XXX XXX (11 digits)
 */
export function formatABN(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

// ============= VALIDATORS =============

/**
 * Validates Australian phone number
 */
export function isValidAUPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Australian mobile: starts with 04 and 10 digits
  if (digits.startsWith('04') && digits.length === 10) return true;
  
  // Australian landline: starts with 0[2-9] and 10 digits
  if (/^0[2-9]/.test(digits) && digits.length === 10) return true;
  
  // International format: starts with 61 and 11 digits
  if (digits.startsWith('61') && digits.length === 11) return true;
  
  return false;
}

/**
 * Validates Australian Business Number (ABN) using the official algorithm
 * https://abr.business.gov.au/Help/AbnFormat
 */
export function isValidABN(abn: string): boolean {
  const digits = abn.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  
  // Subtract 1 from first digit
  const adjusted = [parseInt(digits[0]) - 1, ...digits.slice(1).split('').map(Number)];
  
  // Calculate weighted sum
  const sum = adjusted.reduce((acc, digit, i) => acc + digit * weights[i], 0);
  
  // Valid if divisible by 89
  return sum % 89 === 0;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============= ZOD SCHEMAS =============

export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform(capitalizeWords),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => !val || isValidAUPhone(val),
      "Invalid Australian phone number (04XX XXX XXX or +61 X XXXX XXXX)"
    )
    .optional()
    .or(z.literal('')),
  abn: z
    .string()
    .trim()
    .refine(
      (val) => !val || isValidABN(val),
      "Invalid ABN (must be 11 digits in format XX XXX XXX XXX)"
    )
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

export const propertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Property name is required")
    .max(100, "Name must be less than 100 characters"),
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(255, "Address must be less than 255 characters"),
  suburb: z.string().trim().max(100).optional(),
  post_code: z
    .string()
    .trim()
    .refine(
      (val) => !val || /^\d{4}$/.test(val),
      "Post code must be 4 digits"
    )
    .optional()
    .or(z.literal('')),
  state: z.string().trim().max(20).optional(),
  bedrooms: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(50, "Maximum 50 bedrooms"),
  bathrooms: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(50, "Maximum 50 bathrooms"),
  property_type: z.enum(["commercial", "airbnb", "other"]),
});

export const jobSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  location: z.string().min(1, "Location is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  scheduled_time: z.string().min(1, "Time is required"),
  checklist: z.string().min(1, "At least one service is required"),
});

// ============= FORM ERROR HELPERS =============

export interface FieldError {
  field: string;
  message: string;
}

export function getFieldErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): FieldError[] {
  const result = schema.safeParse(data);
  if (result.success) return [];
  
  return result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

export function getFirstError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): string | null {
  const errors = getFieldErrors(schema, data);
  return errors.length > 0 ? errors[0].message : null;
}
