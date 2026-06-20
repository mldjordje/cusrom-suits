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
