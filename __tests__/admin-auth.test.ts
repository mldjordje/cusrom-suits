import { afterEach, describe, expect, it, vi } from "vitest";

const originalSecret = process.env.ADMIN_SESSION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  vi.resetModules();
});

describe("admin session configuration", () => {
  it("treats an unverifiable cookie as unauthenticated when the secret is missing", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    vi.resetModules();
    const { parseAdminSessionValue } = await import("@/lib/adminAuth");

    await expect(parseAdminSessionValue("payload.signature")).resolves.toBeNull();
  });

  it("refuses to create a session when the secret is missing", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    vi.resetModules();
    const { buildAdminSessionValue } = await import("@/lib/adminAuth");

    await expect(buildAdminSessionValue({
      id: "owner",
      username: "owner@example.com",
      displayName: "Owner",
      roleIds: ["owner"],
      permissions: ["*"],
    })).rejects.toThrow("ADMIN_SESSION_SECRET is not configured");
  });
});

describe("admin session expiry", () => {
  const viewer = {
    id: "owner",
    username: "owner@example.com",
    displayName: "Owner",
    roleIds: ["owner"] as const,
    permissions: ["*"] as const,
  };

  const loadAuth = async (maxAgeDays?: string) => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    if (maxAgeDays === undefined) delete process.env.ADMIN_SESSION_MAX_AGE_DAYS;
    else process.env.ADMIN_SESSION_MAX_AGE_DAYS = maxAgeDays;
    vi.resetModules();
    return import("@/lib/adminAuth");
  };

  afterEach(() => {
    delete process.env.ADMIN_SESSION_MAX_AGE_DAYS;
    vi.useRealTimers();
  });

  it("accepts a freshly issued session", async () => {
    const { buildAdminSessionValue, parseAdminSessionValue } = await loadAuth();
    const value = await buildAdminSessionValue({ ...viewer, roleIds: ["owner"], permissions: ["*"] });

    await expect(parseAdminSessionValue(value)).resolves.toMatchObject({ id: "owner" });
  });

  it("rejects a session older than the configured max age", async () => {
    const { buildAdminSessionValue, parseAdminSessionValue } = await loadAuth("1");
    const value = await buildAdminSessionValue({ ...viewer, roleIds: ["owner"], permissions: ["*"] });

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2 * 24 * 60 * 60 * 1000);

    await expect(parseAdminSessionValue(value)).resolves.toBeNull();
  });

  it("rejects a correctly signed payload that carries no issuedAt", async () => {
    const { parseAdminSessionValue } = await loadAuth();
    const { createHmac } = await import("crypto");
    const payload = Buffer.from(
      JSON.stringify({ id: "owner", username: "owner@example.com", roleIds: ["owner"], permissions: ["*"] }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const signature = createHmac("sha256", "test-secret")
      .update(payload)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    await expect(parseAdminSessionValue(`${payload}.${signature}`)).resolves.toBeNull();
  });

  it("no longer accepts the legacy simple:user:password cookie", async () => {
    process.env.ADMIN_USERNAME = "owner";
    process.env.ADMIN_PASSWORD = "hunter2";
    const { parseAdminSessionValue } = await loadAuth();

    await expect(parseAdminSessionValue("simple:owner:hunter2")).resolves.toBeNull();
  });
});
