-- 1. Add username & email columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. RLS policies (gunakan DO block untuk cek eksistensi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- 3. Drop existing functions first (to avoid parameter name conflicts)
DROP FUNCTION IF EXISTS lookup_email_by_username(TEXT);
DROP FUNCTION IF EXISTS insert_profile(UUID, TEXT, TEXT, TEXT);

-- 4. Public lookup function: get email by username
CREATE FUNCTION lookup_email_by_username(lookup_username TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT email FROM profiles WHERE username = lookup_username LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_email_by_username(TEXT) TO public;

-- 5. RPC: insert profile (bypasses RLS via SECURITY DEFINER)
CREATE FUNCTION insert_profile(
  p_id UUID,
  p_role TEXT,
  p_username TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO profiles (id, role, username, email)
  VALUES (p_id, p_role, p_username, p_email);
$$;

GRANT EXECUTE ON FUNCTION insert_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
