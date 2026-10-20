CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  email_key TEXT NOT NULL,
  phone_key TEXT NOT NULL,
  ip_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','confirmed','cancelled'))
);
CREATE INDEX IF NOT EXISTS reservations_email ON reservations(email_key, created_at);
CREATE INDEX IF NOT EXISTS reservations_phone ON reservations(phone_key, created_at);
CREATE INDEX IF NOT EXISTS reservations_ip ON reservations(ip_key, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_payload_contact
  ON reservations(payload_hash, email_key, phone_key);
CREATE TRIGGER IF NOT EXISTS reservation_quota
BEFORE INSERT ON reservations
WHEN NOT EXISTS (SELECT 1 FROM reservations WHERE id = NEW.id)
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM reservations
    WHERE payload_hash = NEW.payload_hash
      AND email_key = NEW.email_key
      AND phone_key = NEW.phone_key
  ) THEN RAISE(ABORT, 'DUPLICATE_REQUEST') END;
  SELECT CASE WHEN
    (SELECT COUNT(*) FROM reservations WHERE email_key = NEW.email_key
      AND created_at > NEW.created_at - 86400) >= 3
    OR (SELECT COUNT(*) FROM reservations WHERE phone_key = NEW.phone_key
      AND created_at > NEW.created_at - 86400) >= 3
    THEN RAISE(ABORT, 'CONTACT_QUOTA') END;
  SELECT CASE WHEN
    (SELECT COUNT(*) FROM reservations WHERE ip_key = NEW.ip_key
      AND created_at > NEW.created_at - 600) >= 20
    THEN RAISE(ABORT, 'IP_QUOTA') END;
END;
