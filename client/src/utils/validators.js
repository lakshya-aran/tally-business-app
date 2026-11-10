// Client-side checks mirror server/validators so users get instant feedback.
// The server re-validates everything; these are for UX only.

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

export function passwordIssues(pw = '') {
  const issues = [];
  if (pw.length < 8) issues.push('at least 8 characters');
  if (!/[a-z]/.test(pw)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(pw)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(pw)) issues.push('a number');
  return issues;
}

export function passwordError(pw) {
  if (!pw) return 'Password is required';
  const issues = passwordIssues(pw);
  return issues.length ? `Password needs ${issues.join(', ')}` : undefined;
}

export const required = (v, label) => (!String(v ?? '').trim() ? `${label} is required` : undefined);

export function nameError(v, label = 'Name') {
  return required(v, label) || (String(v).trim().length < 2 ? `${label} must be at least 2 characters` : undefined);
}

export function emailError(v) {
  return required(v, 'Email') || (!isEmail(v) ? 'Enter a valid email address' : undefined);
}

export function phoneError(v) {
  if (!v) return undefined;
  return /^[+0-9 ()-]{7,20}$/.test(v) ? undefined : 'Enter a valid phone number';
}
