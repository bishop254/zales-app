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

export function validateName(value: string, label: string) {
  const requiredError = validateRequired(value, label);
  if (requiredError) {
    return requiredError;
  }

  if (/\d/.test(value)) {
    return `${label} cannot contain numbers.`;
  }

  return '';
}

export function validatePhoneNumber(phoneNumber: string, validLengths: number[] = [10]) {
  const value = phoneNumber.trim();

  if (!value) {
    return 'Phone number is required.';
  }

  if (!/^\d+$/.test(value)) {
    return 'Phone number must contain digits only.';
  }

  if (!validLengths.includes(value.length)) {
    const lengthText =
      validLengths.length === 1
        ? `${validLengths[0]} digits`
        : `${validLengths.slice(0, -1).join(', ')} or ${validLengths[validLengths.length - 1]} digits`;
    return `Phone number must be ${lengthText} for the selected country.`;
  }

  return '';
}

export function validatePhoneCountryCode(phoneCountryCode: string) {
  const value = phoneCountryCode.trim();

  if (!value) {
    return 'Country code is required.';
  }

  if (!/^\+\d{1,4}$/.test(value)) {
    return 'Country code must look like +254.';
  }

  return '';
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return '';
}
