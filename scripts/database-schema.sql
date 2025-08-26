-- Stumble Higher Database Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farcaster_id TEXT UNIQUE,
  farcaster_username TEXT,
  eth_address TEXT UNIQUE,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  reputation_score INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  total_upvotes INTEGER DEFAULT 0,
  total_downvotes INTEGER DEFAULT 0,
  total_rewards_earned DECIMAL DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- books, articles, videos, tools, research, philosophy
  tags TEXT[], -- inspiring, educational, practical, creative, deep
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INTEGER,
  submitted_by UUID REFERENCES users(id),
  submission_tx_hash TEXT, -- $HIGHER payment transaction
  submission_amount DECIMAL DEFAULT 1000,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  quality_score DECIMAL DEFAULT 0,
  trending_score DECIMAL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT,
  is_genesis BOOLEAN DEFAULT FALSE, -- Mark content from original JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  weight DECIMAL DEFAULT 1.0, -- Based on user reputation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- User interactions table
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_id UUID REFERENCES resources(id),
  interaction_type TEXT NOT NULL, -- view, favorite, share, complete, click_through
  session_id TEXT,
  metadata JSONB DEFAULT '{}', -- {duration, completion_percentage, source, etc}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  preferred_categories TEXT[] DEFAULT '{}',
  excluded_categories TEXT[] DEFAULT '{}',
  preferred_difficulty TEXT DEFAULT 'intermediate',
  max_time_minutes INTEGER DEFAULT 60,
  hide_videos BOOLEAN DEFAULT FALSE,
  hide_long_content BOOLEAN DEFAULT FALSE,
  notification_settings JSONB DEFAULT '{"email": true, "push": false}',
  discovery_algorithm TEXT DEFAULT 'balanced' CHECK (discovery_algorithm IN ('balanced', 'popular', 'recent', 'personalized')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_id UUID REFERENCES resources(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

-- Weekly rewards table
CREATE TABLE weekly_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_pool_amount DECIMAL NOT NULL DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  calculation_completed_at TIMESTAMP WITH TIME ZONE,
  distribution_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reward distributions table
CREATE TABLE reward_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_reward_id UUID REFERENCES weekly_rewards(id),
  user_id UUID REFERENCES users(id),
  resource_id UUID REFERENCES resources(id),
  amount DECIMAL NOT NULL,
  rank INTEGER,
  quality_score DECIMAL,
  tx_hash TEXT,
  distributed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table (for community moderation)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id),
  reported_by UUID REFERENCES users(id),
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'broken_link', 'duplicate', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- page_view, stumble, submit, vote, share, etc.
  user_id UUID REFERENCES users(id),
  resource_id UUID REFERENCES resources(id),
  session_id TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin actions table
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- user, resource, etc.
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_farcaster_id ON users(farcaster_id);
CREATE INDEX idx_users_eth_address ON users(eth_address);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_submitted_by ON resources(submitted_by);
CREATE INDEX idx_resources_quality_score ON resources(quality_score);
CREATE INDEX idx_resources_trending_score ON resources(trending_score);
CREATE INDEX idx_resources_created_at ON resources(created_at);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

CREATE INDEX idx_votes_resource_id ON votes(resource_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_created_at ON votes(created_at);

CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_resource_id ON user_interactions(resource_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_resource_id ON favorites(resource_id);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view all users but only update their own data
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Resources are publicly viewable, users can submit
CREATE POLICY "Resources are publicly viewable" ON resources FOR SELECT USING (true);
CREATE POLICY "Users can submit resources" ON resources FOR INSERT WITH CHECK (auth.uid()::text = submitted_by::text);
CREATE POLICY "Users can update own submissions" ON resources FOR UPDATE USING (auth.uid()::text = submitted_by::text);

-- Votes are publicly viewable, users can vote
CREATE POLICY "Votes are publicly viewable" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON votes FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own votes" ON votes FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own votes" ON votes FOR DELETE USING (auth.uid()::text = user_id::text);

-- User interactions are private to each user
CREATE POLICY "Users can view own interactions" ON user_interactions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- User preferences are private
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR ALL USING (auth.uid()::text = user_id::text);

-- Favorites are private to each user
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid()::text = user_id::text);

-- Reports can be submitted by anyone, viewed by admins
CREATE POLICY "Anyone can submit reports" ON reports FOR INSERT WITH CHECK (auth.uid()::text = reported_by::text);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid()::text = reported_by::text);

-- Analytics events are insert-only
CREATE POLICY "Users can track own events" ON analytics_events FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IS NULL);

-- Insert default system configuration
INSERT INTO system_config (key, value) VALUES
('submission_cost', '1000'),
('reward_pool_percentage', '60'),
('treasury_percentage', '30'),
('lp_percentage', '10'),
('auto_approve_threshold', '10'),
('auto_hide_threshold', '-5'),
('min_votes_for_auto_action', '3'),
('max_reputation_weight', '5.0'),
('weekly_distribution_percentage', '80');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
