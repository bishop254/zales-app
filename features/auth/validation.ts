export function validateEmail(email: string) {
  const value = email.trim().toLowerCase();

  if (!value) {
    return 'Email is required.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    return 'Enter a valid work email address.';
  }

  return '';
}

export function validatePassword(password: string) {
  if (!password) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return '';
}

export function validateRequired(value: string, label: string) {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  return '';
}
