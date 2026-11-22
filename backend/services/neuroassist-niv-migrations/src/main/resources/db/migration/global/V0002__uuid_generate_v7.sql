-- schema: global
-- V0002__uuid_generate_v7.sql
-- Time-ordered UUIDv7 (draft RFC 9562). No native Postgres function of this name
-- exists; the baseline provides it so every module's UUID v7 PK default resolves
-- (resolves doc 06 G5). Lives in neuroassist_global; on tenant search_path (INV-MIG-5).
CREATE OR REPLACE FUNCTION neuroassist_global.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms  bigint;
    uuid_bytes  bytea;
BEGIN
    unix_ts_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
    -- 16 random bytes, then overwrite the first 6 with the millisecond timestamp
    uuid_bytes := gen_random_bytes(16);
    uuid_bytes := set_byte(uuid_bytes, 0, (unix_ts_ms >> 40) & 255);
    uuid_bytes := set_byte(uuid_bytes, 1, (unix_ts_ms >> 32) & 255);
    uuid_bytes := set_byte(uuid_bytes, 2, (unix_ts_ms >> 24) & 255);
    uuid_bytes := set_byte(uuid_bytes, 3, (unix_ts_ms >> 16) & 255);
    uuid_bytes := set_byte(uuid_bytes, 4, (unix_ts_ms >>  8) & 255);
    uuid_bytes := set_byte(uuid_bytes, 5,  unix_ts_ms        & 255);
    -- version 7 in the high nibble of byte 6
    uuid_bytes := set_byte(uuid_bytes, 6, (112 | (get_byte(uuid_bytes, 6) & 15)));
    -- RFC 4122 variant (10xx) in the high bits of byte 8
    uuid_bytes := set_byte(uuid_bytes, 8, (128 | (get_byte(uuid_bytes, 8) & 63)));
    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

COMMENT ON FUNCTION neuroassist_global.uuid_generate_v7() IS
  'Time-ordered UUIDv7 PK generator (baseline V0002, resolves doc 06 G5). Depends on pgcrypto.gen_random_bytes.';
