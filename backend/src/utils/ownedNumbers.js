// Helpers for users who own more than one 9tel number.
//
// Data model (see models/User.js):
//   - `numbers[]`     every 9tel number the user has bought (one per country),
//                     each with its own 30-day access expiry.
//   - `phoneNumber` / `phoneNumberExpiresAt`
//                     the ACTIVE number — the one used for outgoing calls and
//                     texts. It mirrors one entry of `numbers[]`. Everything
//                     that already reads `user.phoneNumber` (voice, messages,
//                     forwarding, blocking) therefore keeps working unchanged.
//
// Accounts created before multi-number support only have `phoneNumber`; they
// are treated as owning that single number until their next purchase/switch
// writes it into `numbers[]`.

const NUMBER_ACCESS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_OWNED_NUMBERS = Math.max(1, Number(process.env.MAX_OWNED_NUMBERS) || 5);

const toTime = (value) => (value ? new Date(value).getTime() : 0);

// Mongo filter matching the account that owns `number`, whether it is the
// active number or one of the others.
function numberOwnerFilter(number) {
  return { $or: [{ phoneNumber: number }, { "numbers.phoneNumber": number }] };
}

// All numbers the user owns, active one flagged. Legacy single-number
// accounts are folded in so callers never need to special-case them.
function ownedNumbers(user) {
  if (!user) return [];
  const list = (user.numbers || []).map((entry) => ({
    phoneNumber: entry.phoneNumber,
    countryCode: entry.countryCode || null,
    expiresAt: entry.expiresAt || null,
    purchasedAt: entry.purchasedAt || null,
  }));
  if (user.phoneNumber && !list.some((entry) => entry.phoneNumber === user.phoneNumber)) {
    list.unshift({
      phoneNumber: user.phoneNumber,
      countryCode: null,
      expiresAt: user.phoneNumberExpiresAt || null,
      purchasedAt: null,
    });
  }
  return list.map((entry) => ({
    ...entry,
    // The top-level expiry is the source of truth for the active number.
    expiresAt: entry.phoneNumber === user.phoneNumber ? user.phoneNumberExpiresAt || entry.expiresAt : entry.expiresAt,
    isActive: entry.phoneNumber === user.phoneNumber,
  }));
}

function ownsNumber(user, number) {
  return ownedNumbers(user).some((entry) => entry.phoneNumber === number);
}

// What the API returns to the app.
function numbersPayload(user, now = Date.now()) {
  const numbers = ownedNumbers(user).map((entry) => ({
    phoneNumber: entry.phoneNumber,
    countryCode: entry.countryCode,
    expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
    expired: toTime(entry.expiresAt) <= now,
    isActive: entry.isActive,
  }));
  const active = numbers.find((entry) => entry.isActive && !entry.expired);
  // `phoneNumber` keeps its old meaning: the usable active number, or null.
  return { phoneNumber: active ? active.phoneNumber : null, numbers };
}

module.exports = { NUMBER_ACCESS_PERIOD_MS, MAX_OWNED_NUMBERS, numberOwnerFilter, ownedNumbers, ownsNumber, numbersPayload };
