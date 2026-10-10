import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/config/client";

export type OwnedNumber = {
  phoneNumber: string;
  countryCode: string | null;
  expiresAt: string | null;
  expired: boolean;
  /** The number used for outgoing calls and texts. Exactly one is active. */
  isActive: boolean;
};

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Sign in to manage your 9tel number.");
  return { Authorization: `Bearer ${token}` };
}

// Accepts both the multi-number response ({ phoneNumber, numbers: [...] }) and
// the older single-number one ({ phoneNumber }), so the app keeps working
// against a backend that hasn't been updated yet.
export function normalizeNumbers(data: any): { activeNumber: string | null; numbers: OwnedNumber[] } {
  const activeNumber: string | null = data?.phoneNumber ?? null;
  if (Array.isArray(data?.numbers)) {
    const numbers: OwnedNumber[] = data.numbers
      .filter((entry: any) => typeof entry?.phoneNumber === "string")
      .map((entry: any) => ({
        phoneNumber: entry.phoneNumber,
        countryCode: entry.countryCode ?? null,
        expiresAt: entry.expiresAt ?? null,
        expired: entry.expired === true,
        isActive: entry.isActive === true,
      }));
    return { activeNumber, numbers };
  }
  return {
    activeNumber,
    numbers: activeNumber
      ? [{ phoneNumber: activeNumber, countryCode: null, expiresAt: null, expired: false, isActive: true }]
      : [],
  };
}

export async function getMyNumbers(): Promise<OwnedNumber[]> {
  const response = await fetch(`${API_BASE}/api/v1/numbers/mine`, {
    headers: await authHeader(),
  });
  if (!response.ok) throw new Error("Unable to look up your numbers right now.");
  return normalizeNumbers(await response.json()).numbers;
}

/** The active number (the one used for calls), or null. */
export async function getMyNumber(): Promise<string | null> {
  const response = await fetch(`${API_BASE}/api/v1/numbers/mine`, {
    headers: await authHeader(),
  });
  if (!response.ok) throw new Error("Unable to look up your number right now.");
  return normalizeNumbers(await response.json()).activeNumber;
}

/** Choose which owned number is used for outgoing calls and texts. */
export async function setActiveNumber(phoneNumber: string): Promise<OwnedNumber[]> {
  const response = await fetch(`${API_BASE}/api/v1/numbers/active`, {
    method: "PUT",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to switch your number right now.");
  return normalizeNumbers(data).numbers;
}
