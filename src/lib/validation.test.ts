import { describe, it, expect } from 'vitest';
import {
  capitalizeWords,
  formatAUPhone,
  formatABN,
  isValidAUPhone,
  isValidABN,
  isValidEmail,
  clientSchema,
  getFieldErrors,
  getFirstError,
} from './validation';

describe('capitalizeWords', () => {
  it('should capitalize first letter of each word', () => {
    expect(capitalizeWords('john doe')).toBe('John Doe');
    expect(capitalizeWords('JOHN DOE')).toBe('John Doe');
    expect(capitalizeWords('jOhN dOe')).toBe('John Doe');
  });

  it('should handle single words', () => {
    expect(capitalizeWords('john')).toBe('John');
    expect(capitalizeWords('JOHN')).toBe('John');
  });

  it('should handle empty strings', () => {
    expect(capitalizeWords('')).toBe('');
  });
});

describe('formatAUPhone', () => {
  it('should format mobile numbers (04XX)', () => {
    expect(formatAUPhone('0412345678')).toBe('0412 345 678');
    expect(formatAUPhone('0412 345 678')).toBe('0412 345 678');
    expect(formatAUPhone('0412-345-678')).toBe('0412 345 678');
  });

  it('should format landline numbers (0X)', () => {
    expect(formatAUPhone('0212345678')).toBe('02 1234 5678');
    expect(formatAUPhone('0312345678')).toBe('03 1234 5678');
  });

  it('should format international format (+61)', () => {
    expect(formatAUPhone('61412345678')).toBe('+61 412 345 678');
    expect(formatAUPhone('61212345678')).toBe('+61 2 1234 5678');
  });

  it('should handle partial inputs', () => {
    expect(formatAUPhone('0412')).toBe('0412');
    expect(formatAUPhone('041234')).toBe('0412 34');
  });
});

describe('formatABN', () => {
  it('should format 11-digit ABN', () => {
    expect(formatABN('12345678901')).toBe('12 345 678 901');
  });

  it('should handle partial inputs', () => {
    expect(formatABN('12')).toBe('12');
    expect(formatABN('12345')).toBe('12 345');
    expect(formatABN('12345678')).toBe('12 345 678');
  });

  it('should strip non-digit characters', () => {
    expect(formatABN('12 345 678 901')).toBe('12 345 678 901');
    expect(formatABN('12-345-678-901')).toBe('12 345 678 901');
  });

  it('should truncate to 11 digits', () => {
    expect(formatABN('123456789012345')).toBe('12 345 678 901');
  });
});

describe('isValidAUPhone', () => {
  it('should validate Australian mobile numbers', () => {
    expect(isValidAUPhone('0412345678')).toBe(true);
    expect(isValidAUPhone('0400000000')).toBe(true);
    expect(isValidAUPhone('0499999999')).toBe(true);
  });

  it('should validate Australian landline numbers', () => {
    expect(isValidAUPhone('0212345678')).toBe(true);
    expect(isValidAUPhone('0312345678')).toBe(true);
    expect(isValidAUPhone('0712345678')).toBe(true);
  });

  it('should validate international format', () => {
    expect(isValidAUPhone('61412345678')).toBe(true);
    expect(isValidAUPhone('61212345678')).toBe(true);
  });

  it('should reject invalid numbers', () => {
    expect(isValidAUPhone('041234567')).toBe(false); // Too short
    expect(isValidAUPhone('04123456789')).toBe(false); // Too long
    expect(isValidAUPhone('0112345678')).toBe(false); // Invalid prefix
    expect(isValidAUPhone('1234567890')).toBe(false); // No valid prefix
  });

  it('should handle formatted input', () => {
    expect(isValidAUPhone('0412 345 678')).toBe(true);
    expect(isValidAUPhone('+61 412 345 678')).toBe(true);
  });
});

describe('isValidABN', () => {
  it('should validate correct ABNs using official algorithm', () => {
    // These are known valid ABNs
    expect(isValidABN('51824753556')).toBe(true); // Australian Taxation Office
    expect(isValidABN('53004085616')).toBe(true);
  });

  it('should reject invalid ABNs', () => {
    expect(isValidABN('12345678901')).toBe(false);
    expect(isValidABN('00000000000')).toBe(false);
    expect(isValidABN('11111111111')).toBe(false);
  });

  it('should reject ABNs with wrong length', () => {
    expect(isValidABN('1234567890')).toBe(false); // 10 digits
    expect(isValidABN('123456789012')).toBe(false); // 12 digits
  });

  it('should handle formatted input', () => {
    expect(isValidABN('51 824 753 556')).toBe(true);
    expect(isValidABN('51-824-753-556')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.au')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('no@domain')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('clientSchema', () => {
  it('should validate a complete valid client', () => {
    const result = clientSchema.safeParse({
      name: 'john doe',
      email: 'john@example.com',
      phone: '0412345678',
      abn: '51824753556',
      notes: 'Some notes',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe'); // Capitalized
    }
  });

  it('should require name', () => {
    const result = clientSchema.safeParse({
      email: 'john@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should allow optional fields to be empty', () => {
    const result = clientSchema.safeParse({
      name: 'john doe',
      email: '',
      phone: '',
      abn: '',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = clientSchema.safeParse({
      name: 'john doe',
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid phone format', () => {
    const result = clientSchema.safeParse({
      name: 'john doe',
      phone: '1234',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid ABN', () => {
    const result = clientSchema.safeParse({
      name: 'john doe',
      abn: '12345678901',
    });
    expect(result.success).toBe(false);
  });
});

describe('getFieldErrors', () => {
  it('should return empty array for valid data', () => {
    const errors = getFieldErrors(clientSchema, { name: 'John Doe' });
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid data', () => {
    const errors = getFieldErrors(clientSchema, { name: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('name');
  });
});

describe('getFirstError', () => {
  it('should return null for valid data', () => {
    const error = getFirstError(clientSchema, { name: 'John Doe' });
    expect(error).toBeNull();
  });

  it('should return first error message for invalid data', () => {
    const error = getFirstError(clientSchema, { name: '' });
    expect(error).not.toBeNull();
    expect(typeof error).toBe('string');
  });
});
