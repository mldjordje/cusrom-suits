import { describe, expect, it } from "vitest";
import { matchOrderToAccount, normalizeEmail } from "@/lib/orders/accountMatch";
import { getProfileCompleteness, readStorefrontProfile } from "@/lib/storefront/accountProfile";

const USER_ID = "11111111-2222-3333-4444-555555555555";
const EMAIL = "marko@example.com";

const order = (extra: Record<string, unknown> = {}) => ({
  source: "storefront",
  type: "webshop",
  config: null,
  contact: null,
  ...extra,
});

describe("matchOrderToAccount", () => {
  it("claims an order placed while signed in", () => {
    const row = order({ config: { storefrontUserId: USER_ID } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBe("account");
  });

  it("claims a guest order sent from the confirmed account email", () => {
    const row = order({ contact: { email: EMAIL } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBe("email");
  });

  it("ignores case on the stored address", () => {
    const row = order({ contact: { email: "  MARKO@Example.com " } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBe("email");
  });

  it("falls back to the customer block when contact has no email", () => {
    const row = order({ config: { customer: { email: EMAIL } } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBe("email");
  });

  it("never matches by email while the account email is unconfirmed", () => {
    /* The route passes "" for an unconfirmed address. Without this, signing up
       under someone else's email would expose their order history. */
    const row = order({ contact: { email: EMAIL } });
    expect(matchOrderToAccount(row, USER_ID, "")).toBeNull();
  });

  it("leaves another customer's order alone", () => {
    const row = order({
      config: { storefrontUserId: "99999999-0000-0000-0000-000000000000" },
      contact: { email: "someone.else@example.com" },
    });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBeNull();
  });

  it("prefers the account link when an order matches both ways", () => {
    const row = order({ config: { storefrontUserId: USER_ID }, contact: { email: EMAIL } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBe("account");
  });

  it("skips orders from other parts of the system", () => {
    const custom = order({ type: "custom-suit", contact: { email: EMAIL } });
    const foreign = order({ source: "ananas", contact: { email: EMAIL } });
    expect(matchOrderToAccount(custom, USER_ID, EMAIL)).toBeNull();
    expect(matchOrderToAccount(foreign, USER_ID, EMAIL)).toBeNull();
  });

  it("does not treat an empty stored email as a match", () => {
    const row = order({ contact: { email: "" }, config: { customer: { email: null } } });
    expect(matchOrderToAccount(row, USER_ID, EMAIL)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases, and survives non-strings", () => {
    expect(normalizeEmail("  Marko@Example.COM ")).toBe("marko@example.com");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(42)).toBe("");
  });
});

describe("readStorefrontProfile", () => {
  it("accepts the name Google sign-in writes", () => {
    /* Google fills `name`, our own signup fills `full_name`. A customer who
       signed in with Google should not meet an empty profile form. */
    expect(readStorefrontProfile({ name: "Marko Markovic" }).fullName).toBe("Marko Markovic");
    expect(readStorefrontProfile({ full_name: "Ana Anic" }).fullName).toBe("Ana Anic");
  });

  it("reads the delivery fields and defaults marketing to off", () => {
    const profile = readStorefrontProfile({
      phone: " 060 111 222 ",
      address: "Knez Mihailova 1",
      city: "Beograd",
      postal_code: "11000",
    });
    expect(profile.phone).toBe("060 111 222");
    expect(profile.city).toBe("Beograd");
    expect(profile.marketingOptIn).toBe(false);
  });

  it("counts what checkout still has to ask for", () => {
    const empty = getProfileCompleteness(readStorefrontProfile({}));
    expect(empty.filled).toBe(0);
    expect(empty.isComplete).toBe(false);
    expect(empty.missing).toContain("phone");

    const full = getProfileCompleteness(
      readStorefrontProfile({
        full_name: "Ana Anic",
        phone: "060",
        address: "Ulica 1",
        city: "Nis",
        postal_code: "18000",
      }),
    );
    expect(full.isComplete).toBe(true);
    expect(full.percent).toBe(100);
  });
});
