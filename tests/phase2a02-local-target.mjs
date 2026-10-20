// Local-only harness boundary. Never consumes a URL, .env, or linked project.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

export const target = 'supabase_db_mpia-phase2a01-implementation';
export const container = 'e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6';
export const image = 'sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc';
export function docker(args, input) {
  return execFileSync('docker', ['--context', 'desktop-linux', ...args], {
    input, encoding: 'utf8', timeout: 20000, killSignal: 'SIGKILL', maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
}
export const psqlArgs = ['exec', '-i', '-e', 'PGOPTIONS=-c statement_timeout=12000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=15000', container, 'psql', '-X', '-qAt', '-h', '/var/run/postgresql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
export function sql(input) { return docker(psqlArgs, input).trim(); }
export function verifyTarget() {
  const endpoint = JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0].Endpoints.docker.Host;
  assert.equal(endpoint, 'npipe:////./pipe/dockerDesktopLinuxEngine');
  const meta = JSON.parse(docker(['inspect', container]))[0];
  assert.equal(meta.Id, container);
  assert.equal(meta.Name, '/' + target);
  assert.equal(meta.Image, image);
  assert.equal(meta.State.Running, true);
  assert.equal(meta.Mounts.length, 1);
  assert.equal(meta.Mounts[0].Name, target);
  assert.equal(meta.Mounts[0].Type, 'volume');
  assert.equal(meta.Mounts[0].Destination, '/var/lib/postgresql/data');
  const volume = JSON.parse(docker(['volume', 'inspect', target]))[0];
  assert.equal(volume.Driver, 'local');
  assert.equal(volume.CreatedAt, '2026-10-16T14:23:02Z');
  const identity = JSON.parse(sql(`BEGIN READ ONLY;
    SELECT jsonb_build_object('database',current_database(),'user',current_user,
    'socket',inet_server_addr() IS NULL,'version',current_setting('server_version'),
    'readOnly',current_setting('transaction_read_only'),'users',(SELECT count(*) FROM auth.users)); COMMIT;`));
  assert.equal(identity.database, 'postgres');
  assert.equal(identity.user, 'postgres');
  assert.equal(identity.socket, true);
  assert.equal(identity.readOnly, 'on');
  assert.equal(identity.version, '17.11');
  return { container, image, volume: volume.Name, volumeCreatedAt: volume.CreatedAt, endpoint, ...identity };
}
