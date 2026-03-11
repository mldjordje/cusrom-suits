const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const adminToken = (process.env.ADMIN_ACCESS_TOKEN || "").trim();

const tests = [
  { label: "Home", path: "/" },
  { label: "Web shop listing", path: "/web-shop" },
  { label: "Web shop on sale", path: "/web-shop?onSale=1" },
  { label: "Blog", path: "/blog" },
  { label: "Kontakt", path: "/kontakt" },
  { label: "Legacy API", path: "/api/legacy/products?page=1&pageSize=1" },
  { label: "Blog API", path: "/api/blog/posts?page=1&pageSize=1" },
];

if (adminToken) {
  tests.push(
    { label: "Admin dashboard", path: `/admin?token=${encodeURIComponent(adminToken)}` },
    { label: "Admin webshop API", path: "/api/admin/webshop/products?page=1&pageSize=1", admin: true },
    { label: "Admin integrations API", path: "/api/admin/integrations/runs?limit=1", admin: true },
  );
}

const check = async (test) => {
  const url = new URL(test.path, baseUrl).toString();
  const headers = {};
  if (test.admin && adminToken) headers["x-admin-token"] = adminToken;

  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers,
  });

  const ok = response.status >= 200 && response.status < 400;
  const icon = ok ? "PASS" : "FAIL";
  console.log(`${icon} ${test.label}: ${response.status} ${url}`);
  return ok;
};

const run = async () => {
  const failures = [];
  for (const test of tests) {
    try {
      const ok = await check(test);
      if (!ok) failures.push(test.label);
    } catch (error) {
      failures.push(test.label);
      console.log(`FAIL ${test.label}: ${String(error)}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\nSmoke check failed for ${failures.length} route(s): ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("\nSmoke check passed.");
};

await run();
