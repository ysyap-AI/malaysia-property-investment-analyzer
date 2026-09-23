// Read-only live checks. No accounts are created and no returned rows are printed.
// Empty anonymous results alone do not prove isolation: run the two-user SQL audit.
import process from "node:process";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supply the project's URL and public key through environment variables");
const target = new URL(url);
if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co")) {
  throw new Error("Expected an HTTPS Supabase project URL");
}
if (!key.startsWith("sb_publishable_")) {
  let role;
  try {
    role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
  } catch { /* Rejected below. */ }
  if (role !== "anon") throw new Error("Preflight requires a public key, never a privileged key");
}

const tables = [
  "profiles", "properties", "acquisition_costs", "operating_expenses", "financing",
  "investment_criteria", "scenario_configs",
];
for (const table of tables) {
  try {
    const response = await fetch(`${target.origin}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: key }, signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    const noRows = response.ok && Array.isArray(body) && body.length === 0;
    const denied = [401, 403].includes(response.status) && body.code === "42501";
    const acceptable = noRows || denied;
    console.log(JSON.stringify({
      check: `anonymous ${table}`, status: response.status,
      result: acceptable ? "NO_ROWS_OR_DENIED" : "REVIEW_REQUIRED",
      returnedRows: Array.isArray(body) ? body.length : undefined,
      errorCode: typeof body.code === "string" ? body.code : undefined,
    }));
    if (!acceptable) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ check: `anonymous ${table}`, result: "NOT_VERIFIED", error: error.cause?.code || error.name }));
    process.exitCode = 1;
  }
}
for (const [label, token] of [["missing token", null], ["invalid token", "invalid-audit-token"]]) {
  try {
    const headers = { apikey: key };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${target.origin}/auth/v1/user`, {
      headers, signal: AbortSignal.timeout(15000),
    });
    await response.text();
    const denied = [401, 403].includes(response.status);
    console.log(JSON.stringify({ check: `Auth ${label}`, status: response.status, result: denied ? "DENIED" : "REVIEW_REQUIRED" }));
    if (!denied) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ check: `Auth ${label}`, result: "NOT_VERIFIED", error: error.cause?.code || error.name }));
    process.exitCode = 1;
  }
}
