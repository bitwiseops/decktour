import pkg from "../node_modules/pg/lib/index.js";
const { Pool } = pkg;

const pass = "gj3IOGn36K4tqyFe";
const ref  = "kfygxbrlikrwoidrwqpm";

const urls = [
  // Tutte le region Supabase note — porta 6543 (transaction pooler)
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
];

for (const url of urls) {
  const display = url.replace(/:([^:@]+)@/, ":***@");
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
  try {
    const r = await pool.query("SELECT version()");
    console.log("✅ OK:", display);
    console.log("   PG:", r.rows[0].version.split(" ").slice(0, 2).join(" "));
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.log("❌ FAIL:", display, "-", e.message.slice(0, 80));
    try { await pool.end(); } catch {}
  }
}

console.log("\nNessun endpoint raggiungibile dalla rete corrente.");
