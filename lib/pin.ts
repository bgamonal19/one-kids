import * as Crypto from 'expo-crypto';

export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `onekids:${pin}`);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const next = await hashPin(pin);
  return next === hash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
