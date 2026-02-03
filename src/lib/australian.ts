// Australian business utilities for Pulcrix
// ABN validation, GST calculation, and AU formatting

/**
 * Validates an Australian Business Number (ABN)
 * ABN is an 11-digit number with a specific checksum algorithm
 */
export function validateABN(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const cleanABN = abn.replace(/\s/g, '');
  
  if (cleanABN.length !== 11 || !/^\d+$/.test(cleanABN)) {
    return false;
  }
  
  const digits = cleanABN.split('').map(Number);
  digits[0] -= 1; // Subtract 1 from first digit
  
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);
  return sum % 89 === 0;
}

/**
 * Formats an ABN with standard spacing (XX XXX XXX XXX)
 */
export function formatABN(abn: string): string {
  const clean = abn.replace(/\s/g, '');
  if (clean.length !== 11) return abn;
  return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 11)}`;
}

/**
 * GST Rate in Australia (10%)
 */
export const GST_RATE = 0.10;

/**
 * Calculates GST from a subtotal amount
 * Returns subtotal, GST amount, and total
 */
export function calculateGST(subtotal: number): { subtotal: number; gst: number; total: number } {
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { subtotal, gst, total };
}

/**
 * Extracts the GST component from a GST-inclusive total
 */
export function extractGSTFromTotal(totalIncGST: number): { subtotal: number; gst: number; total: number } {
  const subtotal = Math.round((totalIncGST / (1 + GST_RATE)) * 100) / 100;
  const gst = Math.round((totalIncGST - subtotal) * 100) / 100;
  return { subtotal, gst, total: totalIncGST };
}

/**
 * Formats currency for Australia (A$X,XXX.XX or $X,XXX.XX)
 */
export function formatAUD(amount: number, includeSymbol = true): string {
  const formatted = new Intl.NumberFormat('en-AU', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return formatted;
}

/**
 * Formats a date for Australia (DD/MM/YYYY)
 */
export function formatDateAU(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a date with time for Australia (DD/MM/YYYY HH:MM AM/PM)
 */
export function formatDateTimeAU(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a time for Australia (HH:MM AM/PM)
 */
export function formatTimeAU(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Australian states and territories
 */
export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
] as const;

/**
 * Validates an Australian phone number
 * Accepts formats: 04XX XXX XXX, +614XX XXX XXX, 0X XXXX XXXX
 */
export function validateAUPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '');
  // Mobile: 04XX or +614XX
  const mobileRegex = /^(\+?61|0)4\d{8}$/;
  // Landline: 0X XXXX XXXX or +61X XXXX XXXX
  const landlineRegex = /^(\+?61|0)[2-9]\d{8}$/;
  
  return mobileRegex.test(clean) || landlineRegex.test(clean);
}

/**
 * Formats an Australian phone number to standard format
 */
export function formatAUPhone(phone: string): string {
  const clean = phone.replace(/[\s\-()]/g, '');
  
  // Convert +61 to 0 for display
  let formatted = clean.replace(/^\+61/, '0');
  
  if (formatted.length === 10) {
    // Mobile: 0XXX XXX XXX
    if (formatted.startsWith('04')) {
      return `${formatted.slice(0, 4)} ${formatted.slice(4, 7)} ${formatted.slice(7)}`;
    }
    // Landline: (0X) XXXX XXXX
    return `(${formatted.slice(0, 2)}) ${formatted.slice(2, 6)} ${formatted.slice(6)}`;
  }
  
  return phone;
}

/**
 * Australian postcode validation (4 digits)
 */
export function validateAUPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode.trim());
}

/**
 * Gets the state from an Australian postcode
 */
export function getStateFromPostcode(postcode: string): string | null {
  const code = parseInt(postcode, 10);
  
  if (code >= 1000 && code <= 2599) return 'NSW';
  if (code >= 2619 && code <= 2899) return 'NSW';
  if (code >= 2921 && code <= 2999) return 'NSW';
  if (code >= 2600 && code <= 2618) return 'ACT';
  if (code >= 2900 && code <= 2920) return 'ACT';
  if (code >= 3000 && code <= 3999) return 'VIC';
  if (code >= 4000 && code <= 4999) return 'QLD';
  if (code >= 5000 && code <= 5799) return 'SA';
  if (code >= 6000 && code <= 6797) return 'WA';
  if (code >= 7000 && code <= 7799) return 'TAS';
  if (code >= 800 && code <= 899) return 'NT';
  
  return null;
}
