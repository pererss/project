-- ============================================================
-- SENTCOR — Полная схема БД v3 (фикс рекурсии RLS)
-- ============================================================

-- 1. ПРОФИЛИ
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT UNIQUE NOT NULL,
  display_name   TEXT,
  avatar_url     TEXT,
  status         TEXT DEFAULT 'offline' CHECK (status IN ('online','idle','dnd','offline')),
  game_status    TEXT,
  custom_status  TEXT,
  sent_coins     BIGINT DEFAULT 0,
  streak_days    INT DEFAULT 0,
  theme          TEXT DEFAULT 'caramel' CHECK (theme IN ('caramel','oled','midnight')),
  last_username_change TIMESTAMPTZ DEFAULT now(),
  last_login     TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  messages_count BIGINT DEFAULT 0,
  servers_count  INT DEFAULT 0
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. СЕРВЕРЫ
CREATE TABLE servers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  icon_url    TEXT,
  description TEXT,
  public      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servers_select" ON servers FOR SELECT
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = servers.id AND sm.user_id = auth.uid()));
CREATE POLICY "servers_insert" ON servers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "servers_update" ON servers FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "servers_delete" ON servers FOR DELETE USING (owner_id = auth.uid());

-- 3. УЧАСТНИКИ СЕРВЕРА (фикс: убрана рекурсивная ссылка)
CREATE TABLE server_members (
  server_id  UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','mod','member')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
-- sm_select: любой авторизованный может видеть участников (для отображения списка)
-- Безопасность: критичные действия защищены другими политиками
CREATE POLICY "sm_select" ON server_members FOR SELECT USING (true);
CREATE POLICY "sm_insert" ON server_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sm_delete" ON server_members FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM servers s WHERE s.id = server_members.server_id AND s.owner_id = auth.uid()));

-- 4. КАНАЛЫ
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice')),
  position    INT DEFAULT 0,
  topic       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_select" ON channels FOR SELECT
  USING (EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = channels.server_id AND sm.user_id = auth.uid()));
CREATE POLICY "channels_insert" ON channels FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM servers s WHERE s.id = channels.server_id AND s.owner_id = auth.uid()));
CREATE POLICY "channels_update" ON channels FOR UPDATE
  USING (EXISTS (SELECT 1 FROM servers s WHERE s.id = channels.server_id AND s.owner_id = auth.uid()));
CREATE POLICY "channels_delete" ON channels FOR DELETE
  USING (EXISTS (SELECT 1 FROM servers s WHERE s.id = channels.server_id AND s.owner_id = auth.uid()));

-- 5. СООБЩЕНИЯ
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  edited      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM channels c JOIN server_members sm ON sm.server_id = c.server_id
    WHERE c.id = messages.channel_id AND sm.user_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM channels c
    JOIN server_members sm ON sm.server_id = c.server_id
    WHERE c.id = messages.channel_id AND sm.user_id = auth.uid() AND c.type = 'text'));
CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM channels c JOIN server_members sm ON sm.server_id = c.server_id
    WHERE c.id = messages.channel_id AND sm.user_id = auth.uid() AND sm.role IN ('owner','admin')
  ));
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- 6. ЗАЯВКИ В ДРУЗЬЯ
CREATE TABLE friend_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_select" ON friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "fr_insert" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "fr_update" ON friend_requests FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "fr_delete" ON friend_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 7. ДРУЗЬЯ
CREATE TABLE friends (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted      BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friends_select" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_insert" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_update" ON friends FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "friends_delete" ON friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 8. БЛОКИРОВКИ
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_select" ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocked_insert" ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocked_delete" ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- 9. ЛИЧНЫЕ СООБЩЕНИЯ
CREATE TABLE direct_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm_select" ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "dm_insert" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "dm_delete" ON direct_messages FOR DELETE USING (auth.uid() = sender_id);

-- 10. ГОЛОСОВЫЕ УЧАСТНИКИ
CREATE TABLE voice_participants (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
ALTER TABLE voice_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_select" ON voice_participants FOR SELECT USING (true);
CREATE POLICY "vp_insert" ON voice_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vp_delete" ON voice_participants FOR DELETE USING (auth.uid() = user_id);

-- 12. ЗВОНКИ
CREATE TABLE calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_name   TEXT NOT NULL,
  status      TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','declined','ended')),
  caller_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select" ON calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "calls_insert" ON calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "calls_update" ON calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- 11. ЕЖЕДНЕВНЫЕ ЛОГИНЫ
CREATE TABLE daily_logins (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, login_date)
);
ALTER TABLE daily_logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dl_select" ON daily_logins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dl_insert" ON daily_logins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ИНДЕКСЫ
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_dm_users ON direct_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_fr_receiver ON friend_requests(receiver_id);
CREATE INDEX idx_sm_user ON server_members(user_id);
CREATE INDEX idx_channels_server ON channels(server_id);
CREATE INDEX idx_blocked ON blocked_users(blocker_id);

-- АВТО-ПРОФИЛЬ
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ТРИГГЕР СТРИКА
CREATE OR REPLACE FUNCTION update_streak_on_login()
RETURNS TRIGGER AS $$
DECLARE
  yesterday DATE := CURRENT_DATE - 1;
  today     DATE := CURRENT_DATE;
  has_today INT;
BEGIN
  SELECT COUNT(*) INTO has_today FROM daily_logins WHERE user_id = NEW.user_id AND login_date = today;
  IF has_today = 0 THEN
    IF EXISTS (SELECT 1 FROM daily_logins WHERE user_id = NEW.user_id AND login_date = yesterday) THEN
      UPDATE profiles SET streak_days = streak_days + 1 WHERE id = NEW.user_id;
    ELSE
      UPDATE profiles SET streak_days = 1 WHERE id = NEW.user_id;
    END IF;
    UPDATE profiles SET sent_coins = sent_coins + (10 + (SELECT LEAST(streak_days, 100) FROM profiles WHERE id = NEW.user_id))
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_daily_login ON daily_logins;
CREATE TRIGGER on_daily_login AFTER INSERT ON daily_logins
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_login();