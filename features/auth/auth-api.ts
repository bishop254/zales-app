import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { apiConfig } from '@/constants/api';
import { parseApiEnvelope } from '@/features/api/api-client';

WebBrowser.maybeCompleteAuthSession();

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  otherName?: string | null;
  roles?: string[];
  profileImageUrl?: string | null;
  referralCode?: string | null;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  countryOfResidence: string;
  referralCode?: string;
};

export type RegistrationResponse = {
  message: string;
};

export type FirstLoginChallenge = {
  requiresPasswordChange: true;
  token: string;
};

export type OtpChallenge = {
  requiresOtp: true;
  token: string;
};

export type LoginResponse = FirstLoginChallenge | OtpChallenge;

export async function loginWithBackend(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  return parseApiEnvelope<LoginResponse>(response);
}

export async function registerWithBackend(payload: RegisterPayload): Promise<RegistrationResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phoneCountryCode: payload.phoneCountryCode.trim(),
      phoneNumber: payload.phoneNumber.trim(),
      countryOfResidence: payload.countryOfResidence.trim(),
      referralCode: payload.referralCode?.trim() || undefined,
    }),
  });

  return parseApiEnvelope<RegistrationResponse>(response);
}

export async function setFirstPassword(token: string, newPassword: string): Promise<AuthResult> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/set-password`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newPassword }),
  });

  return parseApiEnvelope<AuthResult>(response);
}

export async function verifyOtp(token: string, otp: string): Promise<AuthResult> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ otp }),
  });

  return parseApiEnvelope<AuthResult>(response);
}

export async function resendOtp(token: string): Promise<OtpChallenge> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/resend-otp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return parseApiEnvelope<OtpChallenge>(response);
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<AuthUser>(response);
}

function getGoogleReturnUrl() {
  return Linking.createURL('/auth/callback');
}

export function getGoogleAuthUrl() {
  return `${apiConfig.baseUrl}/auth/google`;
}

export async function signInWithGoogleWithBackend(): Promise<AuthResult> {
  const result = await WebBrowser.openAuthSessionAsync(getGoogleAuthUrl(), getGoogleReturnUrl());

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  const parsed = Linking.parse(result.url);
  const accessToken =
    typeof parsed.queryParams?.accessToken === 'string' ? parsed.queryParams.accessToken : '';
  const refreshToken =
    typeof parsed.queryParams?.refreshToken === 'string' ? parsed.queryParams.refreshToken : '';

  if (!accessToken || !refreshToken) {
    throw new Error(
      'Google sign-in did not return tokens. Check FRONTEND_REDIRECT_URL on the backend.'
    );
  }

  const user = await getCurrentUser(accessToken);
  return {
    accessToken,
    refreshToken,
    user,
  };
}
