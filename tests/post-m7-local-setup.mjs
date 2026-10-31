// Fresh local-only Supabase chain. Requires cached Docker images; never pulls or links.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

const project = "mpia-post-m7-disposable-20261031";
const network = `supabase_network_${project}`;
const loopbackNetwork = "mpia-post-m7-loopback-20261031";
const db = `supabase_db_${project}`;
const base = "http://127.0.0.1:57521";
function docker(args, input, env = {}) {
  const r = spawnSync("docker", args, { input, env: { ...process.env, ...env }, encoding: "utf8", timeout: 60000 });
  // Do not echo commands/environment: synthetic secrets remain in process/container memory.
  assert.equal(r.status, 0, r.stderr || r.error?.message);
  return r.stdout.trim();
}
function sql(statement, user = "postgres") {
  return docker(["exec", "-i", db, "psql", "-U", user, "-d", "postgres", "-XAtq", "-v", "ON_ERROR_STOP=1"], statement);
}
function run(name, image, env, extra = [], command = []) {
  const flags = Object.keys(env).flatMap(k => ["--env", k]);
  return docker(["run", "--pull=never", "-d", "--name", name, "--network", network, ...flags, ...extra, image, ...command], undefined, env);
}
const mode = process.argv[2];
assert.ok(["--start", "--resume-bootstrap", "--through-m4", "--through-m5", "--through-m6"].includes(mode), "Choose --start or --through-m4/m5/m6");
if (mode === "--start" || mode === "--resume-bootstrap") {
  // Refuse to reuse any database or migration ledger, including a prior run of this script.
  const names = docker(["ps", "-a", "--format", "{{.Names}}"]);
  if (mode === "--start") {
    assert.ok(!names.split("\n").some(n => n.endsWith(project)), "Disposable name already exists: inspect it instead of resetting/reusing");
    assert.ok(!docker(["volume", "ls", "--format", "{{.Name}}"] ).split("\n").includes(db), "Disposable volume already exists");
  } else {
    assert.deepEqual(names.split("\n").filter(n=>n.endsWith(project)),[db],"Only the fresh DB may exist when resuming bootstrap");
    assert.equal(sql("SELECT to_regclass('public.properties') IS NULL AND to_regclass('supabase_migrations.schema_migrations') IS NULL"),"t","Resume is limited to an empty, unmigrated bootstrap");
  }
  const existing = mode === "--resume-bootstrap" ? Object.fromEntries(JSON.parse(docker(["inspect",db]))[0].Config.Env.map(v=>[v.slice(0,v.indexOf("=")),v.slice(v.indexOf("=")+1)])) : null;
  const password = existing?.POSTGRES_PASSWORD ?? randomBytes(32).toString("hex"), secret = existing?.JWT_SECRET ?? randomBytes(48).toString("hex");
  const token = role => {
    const enc = value => Buffer.from(JSON.stringify(value)).toString("base64url");
    const body = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ role, iss: "supabase", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+86400*7 })}`;
    return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  };
  if (mode === "--start") docker(["network", "create", "--internal", network]);
  // Reuse only the already-reviewed image bootstrap command from the older disposable,
  // never its database volume, ledger, data, passwords or JWT keys.
  const template = JSON.parse(docker(["inspect", "supabase_db_mpia-m4-disposable-20261029"]))[0].Config;
  assert.equal(template.Image, "public.ecr.aws/supabase/postgres:17.11.0.006");
  if (mode === "--start") run(db, template.Image, { POSTGRES_PASSWORD: password, PGPASSWORD: password, POSTGRES_HOST: "/var/run/postgresql", JWT_SECRET: secret, JWT_EXP: "3600" },
    ["--mount", `type=volume,source=${db},target=/var/lib/postgresql/data`, "--entrypoint", "sh"], template.Cmd);
  let ready = false;
  for (let i=0;i<40;i++) {
    const r=spawnSync("docker", ["exec", db, "psql", "-U", "postgres", "-d", "postgres", "-XAtq", "-c", "SELECT to_regclass('auth.users') IS NOT NULL"], { encoding:"utf8" });
    if (r.status===0 && r.stdout.trim()==="t") { ready=true;break; }
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(ready,"Fresh DB did not become ready");
  sql(`CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text);`);
  assert.equal(sql("SELECT count(*) FROM supabase_migrations.schema_migrations"), "0");
  // Supabase stock image provides PostGIS; this is prerequisite provisioning, not
  // a modification of any application migration.
  sql("CREATE EXTENSION postgis WITH SCHEMA extensions VERSION '3.3.7';", "supabase_admin");
  const spatial=JSON.parse(sql("SELECT json_build_object('version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner),'postgres',current_setting('server_version_num')) FROM pg_extension e JOIN pg_namespace n ON e.extnamespace=n.oid WHERE extname='postgis'"));
  assert.equal(spatial.version,"3.3.7"); assert.equal(spatial.schema,"extensions"); assert.equal(spatial.owner,"supabase_admin"); assert.ok(+spatial.postgres>=170000 && +spatial.postgres<180000);
  run(`supabase_auth_${project}`, "public.ecr.aws/supabase/gotrue:v2.197.0", {
    GOTRUE_API_HOST:"0.0.0.0", GOTRUE_API_PORT:"9999", API_EXTERNAL_URL:base,
    GOTRUE_DB_DRIVER:"postgres", GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@${db}:5432/postgres`,
    GOTRUE_SITE_URL:"http://127.0.0.1:5177", GOTRUE_URI_ALLOW_LIST:"http://127.0.0.1:5177/**",
    GOTRUE_JWT_SECRET:secret, GOTRUE_JWT_EXP:"3600", GOTRUE_JWT_AUD:"authenticated", GOTRUE_JWT_DEFAULT_GROUP_NAME:"authenticated",
    GOTRUE_EXTERNAL_EMAIL_ENABLED:"true", GOTRUE_MAILER_AUTOCONFIRM:"true", GOTRUE_DISABLE_SIGNUP:"false", GOTRUE_RATE_LIMIT_EMAIL_SENT:"1000",
  });
  run(`supabase_rest_${project}`, "public.ecr.aws/supabase/postgrest:v16.5", {
    PGRST_DB_URI:`postgres://authenticator:${password}@${db}:5432/postgres`, PGRST_DB_SCHEMAS:"public", PGRST_DB_EXTRA_SEARCH_PATH:"public,extensions",
    PGRST_DB_ANON_ROLE:"anon", PGRST_JWT_SECRET:secret,
  });
  const gateway = `supabase_kong_${project}`;
  // JSON is valid YAML; keys live only in the disposable container's configuration.
  const config = JSON.stringify({ _format_version:"2.1", consumers:[{ username:"anon", keyauth_credentials:[{ key:token("anon") }] }],
    services:[ ["auth",9999,"/auth/v1"], ["rest",3000,"/rest/v1"] ].map(([service,port,path])=>({ name:service, url:`http://supabase_${service}_${project}:${port}/`, routes:[{ name:service, paths:[path], strip_path:true }] })),
    plugins:[{ name:"cors",config:{ origins:["http://127.0.0.1:5177"],methods:["GET","POST","PATCH","DELETE","OPTIONS","PUT"],headers:["authorization","apikey","content-type","x-client-info","prefer","range"],exposed_headers:["content-range"],credentials:true } },{ name:"key-auth",config:{ key_names:["apikey"],hide_credentials:false } }] });
  run(gateway,"public.ecr.aws/supabase/kong:2.8.1",{ KONG_DATABASE:"off", KONG_DECLARATIVE_CONFIG:"/home/kong/kong.yml", KONG_PLUGINS:"bundled", KONG_DNS_ORDER:"LAST,A,CNAME", KONG_NGINX_WORKER_PROCESSES:"1" },
    ["-p","127.0.0.1:57521:8000","--entrypoint","sh"], ["-c","while [ ! -f /home/kong/kong.yml ]; do sleep 1; done; exec /docker-entrypoint.sh kong docker-start"]);
  docker(["exec","-i",gateway,"sh","-c","cat > /home/kong/kong.yml"],config);
  // Docker internal networks do not publish ports. Give only Kong a separate
  // host bridge; its sole published endpoint is still bound to 127.0.0.1.
  docker(["network", "create", loopbackNetwork]);
  docker(["network", "connect", loopbackNetwork, gateway]);
  docker(["restart", gateway]);
  let healthy=false;
  for (let i=0;i<30;i++) {
    try { const r=await fetch(base+"/auth/v1/health",{headers:{apikey:JSON.parse(config).consumers[0].keyauth_credentials[0].key}}); if(r.ok){healthy=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(healthy,"Disposable gateway/Auth did not become healthy");
  console.log("PASS: created fresh isolated local database/gateway",project,base,spatial);
} else {
  assert.equal(docker(["inspect","--format","{{.Config.Image}}",db]),"public.ecr.aws/supabase/postgres:17.11.0.006");
  const files=readdirSync(new URL("../supabase/migrations/",import.meta.url)).filter(n=>n.endsWith(".sql")).sort();
  assert.equal(files.length,10,"Reviewed chain must have exactly ten migrations");
  const target={"--through-m4":8,"--through-m5":9,"--through-m6":10}[mode];
  const ledger=JSON.parse(sql("SELECT coalesce(json_agg(version ORDER BY version),'[]') FROM supabase_migrations.schema_migrations"));
  const versions=files.map(n=>n.split("_")[0]);
  assert.deepEqual(ledger,versions.slice(0,ledger.length),"Ledger differs from approved chain");
  assert.ok(ledger.length<target,"Phase already applied; inspect instead of replaying");
  for (let i=ledger.length;i<target;i++) {
    const text=readFileSync(new URL(`../supabase/migrations/${files[i]}`,import.meta.url),"utf8");
    sql(text);
    sql(`INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ('${versions[i]}','${files[i].replaceAll("'","''")}'); NOTIFY pgrst, 'reload schema';`);
    console.log("PASS: applied unchanged",files[i]);
  }
  console.log("PASS: approved migration prefix",target);
}
