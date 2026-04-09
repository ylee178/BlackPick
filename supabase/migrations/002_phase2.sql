-- ============================================
-- Black Pick — Phase 2 Schema
-- Comments, Notifications, Poster URLs
-- ============================================

-- ── 1. FIGHT COMMENTS ──

CREATE TABLE public.fight_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fight_id UUID NOT NULL REFERENCES fights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES fight_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fight_comments_fight ON fight_comments(fight_id, created_at);
CREATE INDEX idx_fight_comments_parent ON fight_comments(parent_id);

ALTER TABLE fight_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "fight_comments_select" ON fight_comments FOR SELECT USING (true);

-- Logged-in users can insert their own comments
CREATE POLICY "fight_comments_insert" ON fight_comments FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

-- Users can delete their own comments
CREATE POLICY "fight_comments_delete" ON fight_comments FOR DELETE USING (
    user_id = auth.uid()
);

-- ── 2. NOTIFICATIONS ──

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('fight_start', 'result', 'mvp_vote', 'ranking_change')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
    user_id = auth.uid()
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (
    user_id = auth.uid()
);

-- ── 3. POSTER URL + SOURCE ID ON EVENTS ──

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS source_event_id TEXT;

-- ── 4. COMMENT TRANSLATIONS CACHE ──

CREATE TABLE public.comment_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES fight_comments(id) ON DELETE CASCADE,
    target_locale TEXT NOT NULL CHECK (target_locale IN ('en', 'ko', 'ja', 'pt-BR')),
    translated_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (comment_id, target_locale)
);

CREATE INDEX idx_comment_translations_comment ON comment_translations(comment_id);

ALTER TABLE comment_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations
CREATE POLICY "comment_translations_select" ON comment_translations FOR SELECT USING (true);

-- Only server (service role) inserts translations — no user policy needed
