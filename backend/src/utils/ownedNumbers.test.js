const { numberOwnerFilter, ownedNumbers, ownsNumber, numbersPayload } = require("./ownedNumbers");

const FUTURE = new Date(Date.now() + 86400000);
const PAST = new Date(Date.now() - 86400000);

describe("ownedNumbers", () => {
  it("treats a legacy single-number account as owning that number, active", () => {
    const user = { phoneNumber: "+15550001", phoneNumberExpiresAt: FUTURE, numbers: [] };
    expect(ownedNumbers(user)).toEqual([expect.objectContaining({ phoneNumber: "+15550001", isActive: true })]);
    expect(numbersPayload(user).phoneNumber).toBe("+15550001");
  });

  it("flags exactly the mirrored number as active and lists the rest", () => {
    const user = {
      phoneNumber: "+442000002",
      phoneNumberExpiresAt: FUTURE,
      numbers: [
        { phoneNumber: "+15550001", countryCode: "US", expiresAt: FUTURE },
        { phoneNumber: "+442000002", countryCode: "GB", expiresAt: FUTURE },
      ],
    };
    const { phoneNumber, numbers } = numbersPayload(user);
    expect(phoneNumber).toBe("+442000002");
    expect(numbers.map((n) => [n.phoneNumber, n.isActive])).toEqual([["+15550001", false], ["+442000002", true]]);
    expect(ownsNumber(user, "+15550001")).toBe(true);
    expect(ownsNumber(user, "+19999999")).toBe(false);
  });

  it("reports no usable active number when the active one has expired", () => {
    const user = { phoneNumber: "+15550001", phoneNumberExpiresAt: PAST, numbers: [{ phoneNumber: "+15550001", countryCode: "US", expiresAt: PAST }] };
    const payload = numbersPayload(user);
    expect(payload.phoneNumber).toBeNull();
    expect(payload.numbers[0].expired).toBe(true);
  });

  it("matches owners by active or secondary number", () => {
    expect(numberOwnerFilter("+1")).toEqual({ $or: [{ phoneNumber: "+1" }, { "numbers.phoneNumber": "+1" }] });
  });

  it("handles no user", () => {
    expect(ownedNumbers(null)).toEqual([]);
  });
});
