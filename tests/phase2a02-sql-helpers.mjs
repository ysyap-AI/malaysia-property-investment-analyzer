import { literal as l } from './phase2a01-contract-fixtures.mjs';
export const setupChecks = `CREATE TEMP TABLE checks(label text PRIMARY KEY, passed boolean NOT NULL);
CREATE FUNCTION pg_temp.ok(label text, result boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF result IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 INSERT INTO checks VALUES(label,true);
END $$;
CREATE FUNCTION pg_temp.denied(label text, command text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE got text;
BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE; END;
 IF got IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FAIL: % expected % got %',label,expected,coalesce(got,'SUCCESS'); END IF;
 INSERT INTO checks VALUES(label,true);
END $$;
GRANT SELECT,INSERT ON checks TO anon,authenticated,service_role;
`;
export const ok = (label, expression) => `SELECT pg_temp.ok(${l(label)},(${expression}));\n`;
export const denied = (label, command, state = '23514') => `SELECT pg_temp.denied(${l(label)},${l(command)},${l(state)});\n`;
export const resultChecks = `SELECT jsonb_build_object('passed',count(*),'labels',jsonb_agg(label ORDER BY label)) FROM checks;`;
export function parseChecks(output) { return JSON.parse(output.split(/\r?\n/).findLast(x => x.startsWith('{'))); }
