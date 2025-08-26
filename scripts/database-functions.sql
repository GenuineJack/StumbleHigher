-- Stumble Higher Database Functions
-- Run this after the main schema

-- Calculate weighted quality score based on voter reputation
CREATE OR REPLACE FUNCTION calculate_quality_score(resource_id UUID)
RETURNS TABLE(
  upvotes INT,
  downvotes INT,
  weighted_score DECIMAL,
  voter_count INT,
  should_auto_approve BOOLEAN,
  should_auto_hide BOOLEAN
) AS $$
DECLARE
  auto_approve_threshold DECIMAL;
  auto_hide_threshold DECIMAL;
  min_votes_required INT;
BEGIN
  -- Get thresholds from system config
  SELECT (value::TEXT)::DECIMAL INTO auto_approve_threshold
  FROM system_config WHERE key = 'auto_approve_threshold';

  SELECT (value::TEXT)::DECIMAL INTO auto_hide_threshold
  FROM system_config WHERE key = 'auto_hide_threshold';

  SELECT (value::TEXT)::INT INTO min_votes_required
  FROM system_config WHERE key = 'min_votes_for_auto_action';

  RETURN QUERY
  WITH vote_stats AS (
    SELECT
      COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END)::INT as up_count,
      COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END)::INT as down_count,
      COUNT(DISTINCT v.user_id)::INT as total_voters,
      COALESCE(
        SUM(
          CASE
            WHEN v.vote_type = 'up' THEN LEAST((u.reputation_score * 0.1 + 1), 5.0)
            WHEN v.vote_type = 'down' THEN -LEAST((u.reputation_score * 0.1 + 1), 5.0)
            ELSE 0
          END
        ), 0
      ) as calculated_score
    FROM votes v
    JOIN users u ON v.user_id = u.id
    WHERE v.resource_id = calculate_quality_score.resource_id
  )
  SELECT
    vs.up_count,
    vs.down_count,
    vs.calculated_score,
    vs.total_voters,
    (vs.calculated_score >= auto_approve_threshold AND vs.total_voters >= min_votes_required) as should_auto_approve,
    (vs.calculated_score <= auto_hide_threshold AND vs.total_voters >= min_votes_required) as should_auto_hide
  FROM vote_stats vs;
END;
$$ LANGUAGE plpgsql;

-- Update resource scores and status based on votes
CREATE OR REPLACE FUNCTION update_resource_scores(resource_id UUID)
RETURNS VOID AS $$
DECLARE
  score_data RECORD;
  resource_status TEXT;
BEGIN
  -- Calculate current scores
  SELECT * INTO score_data FROM calculate_quality_score(resource_id);

  -- Get current resource status
  SELECT status INTO resource_status FROM resources WHERE id = resource_id;

  -- Update resource with new scores
  UPDATE resources
  SET
    upvotes = score_data.upvotes,
    downvotes = score_data.downvotes,
    quality_score = score_data.weighted_score,
    updated_at = NOW()
  WHERE id = resource_id;

  -- Auto-approve or hide if thresholds are met and currently pending
  IF resource_status = 'pending' THEN
    IF score_data.should_auto_approve THEN
      UPDATE resources
      SET status = 'approved', updated_at = NOW()
      WHERE id = resource_id;
    ELSIF score_data.should_auto_hide THEN
      UPDATE resources
      SET status = 'hidden', updated_at = NOW()
      WHERE id = resource_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Calculate trending score based on recent engagement
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS VOID AS $$
BEGIN
  UPDATE resources
  SET
    trending_score = (
      -- Quality component (40%)
      COALESCE(quality_score, 0) * 0.4 +
      -- Recent views component (30%)
      COALESCE((
        SELECT COUNT(*)::DECIMAL
        FROM user_interactions ui
        WHERE ui.resource_id = resources.id
          AND ui.interaction_type = 'view'
          AND ui.created_at > NOW() - INTERVAL '7 days'
      ), 0) * 0.3 +
      -- Recent votes component (20%)
      COALESCE((
        SELECT COUNT(*)::DECIMAL
        FROM votes v
        WHERE v.resource_id = resources.id
          AND v.created_at > NOW() - INTERVAL '7 days'
      ), 0) * 0.2 +
      -- Recency bonus (10%) - newer content gets slight boost
      CASE
        WHEN created_at > NOW() - INTERVAL '3 days' THEN 5.0
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 2.0
        WHEN created_at > NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.0
      END * 0.1
    ),
    updated_at = NOW()
  WHERE status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Get personalized recommendations for a user
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 10,
  exclude_viewed BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(resource_id UUID, relevance_score DECIMAL) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    -- Analyze user's interaction history
    SELECT
      array_agg(DISTINCT r.category) FILTER (WHERE r.category IS NOT NULL) as liked_categories,
      array_agg(DISTINCT unnest(r.tags)) FILTER (WHERE r.tags IS NOT NULL) as liked_tags,
      COALESCE(AVG(
        CASE r.difficulty_level
          WHEN 'beginner' THEN 1
          WHEN 'intermediate' THEN 2
          WHEN 'advanced' THEN 3
          ELSE 2
        END
      ), 2) as avg_difficulty_preference
    FROM user_interactions ui
    JOIN resources r ON ui.resource_id = r.id
    JOIN votes v ON v.resource_id = r.id AND v.user_id = target_user_id AND v.vote_type = 'up'
    WHERE ui.user_id = target_user_id
      AND ui.interaction_type IN ('view', 'favorite')
      AND ui.created_at > NOW() - INTERVAL '90 days'
  ),
  user_prefs AS (
    SELECT
      COALESCE(preferred_categories, ARRAY[]::TEXT[]) as pref_categories,
      COALESCE(excluded_categories, ARRAY[]::TEXT[]) as excl_categories,
      COALESCE(max_time_minutes, 60) as max_time,
      discovery_algorithm
    FROM user_preferences
    WHERE user_id = target_user_id
  )
  SELECT
    r.id as resource_id,
    (
      -- Category match bonus (25%)
      CASE
        WHEN up.pref_categories != ARRAY[]::TEXT[] AND r.category = ANY(up.pref_categories) THEN 5.0
        WHEN profile.liked_categories IS NOT NULL AND r.category = ANY(profile.liked_categories) THEN 3.0
        ELSE 0.0
      END * 0.25 +

      -- Tag match bonus (20%)
      COALESCE((
        SELECT COUNT(*) * 0.5
        FROM unnest(r.tags) tag
        WHERE profile.liked_tags IS NOT NULL AND tag = ANY(profile.liked_tags)
      ), 0) * 0.20 +

      -- Quality score component (25%)
      COALESCE(r.quality_score, 0) * 0.25 +

      -- Trending component (15%)
      COALESCE(r.trending_score, 0) * 0.15 +

      -- Time preference match (10%)
      CASE
        WHEN r.estimated_time_minutes IS NULL THEN 0.5
        WHEN r.estimated_time_minutes <= up.max_time THEN 2.0
        ELSE 0.0
      END * 0.10 +

      -- Difficulty preference match (5%)
      CASE
        WHEN r.difficulty_level IS NULL THEN 0.5
        WHEN (
          CASE r.difficulty_level
            WHEN 'beginner' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'advanced' THEN 3
          END
        ) = ROUND(profile.avg_difficulty_preference) THEN 1.0
        ELSE 0.0
      END * 0.05

    ) as relevance_score
  FROM resources r
  CROSS JOIN user_profile profile
  CROSS JOIN user_prefs up
  WHERE r.status = 'approved'
    AND (up.excl_categories = ARRAY[]::TEXT[] OR r.category != ALL(up.excl_categories))
    AND (NOT exclude_viewed OR r.id NOT IN (
      SELECT resource_id
      FROM user_interactions
      WHERE user_id = target_user_id
        AND interaction_type = 'view'
        AND created_at > NOW() - INTERVAL '30 days'
    ))
  ORDER BY relevance_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get random stumble content (fallback when no user context)
CREATE OR REPLACE FUNCTION get_random_stumble_content(
  limit_count INTEGER DEFAULT 1,
  exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(resource_id UUID, random_score DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as resource_id,
    (
      -- Quality bias (70%) - higher quality content more likely
      COALESCE(r.quality_score, 0) * 0.7 +
      -- Trending component (20%)
      COALESCE(r.trending_score, 0) * 0.2 +
      -- Random factor (10%)
      RANDOM() * 2.0 * 0.1
    ) as random_score
  FROM resources r
  WHERE r.status = 'approved'
    AND (exclude_ids = ARRAY[]::UUID[] OR r.id != ALL(exclude_ids))
  ORDER BY random_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update user reputation based on content performance
CREATE OR REPLACE FUNCTION update_user_reputation(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  reputation_score INTEGER;
BEGIN
  -- Calculate reputation based on:
  -- - Quality of submitted content (weighted by votes)
  -- - Community participation (voting activity)
  -- - Engagement with content (viewing, favorites)

  WITH user_stats AS (
    SELECT
      -- Points from content submissions (max 50 points per resource)
      COALESCE(SUM(LEAST(r.quality_score * 5, 50)), 0) as content_points,
      -- Points from voting activity (1 point per vote, max 100)
      LEAST((SELECT COUNT(*) FROM votes WHERE user_id = target_user_id), 100) as voting_points,
      -- Points from community engagement (0.1 point per interaction, max 50)
      LEAST((SELECT COUNT(*) * 0.1 FROM user_interactions WHERE user_id = target_user_id), 50) as engagement_points
    FROM resources r
    WHERE r.submitted_by = target_user_id
      AND r.status IN ('approved', 'pending')
  )
  SELECT
    ROUND(us.content_points + us.voting_points + us.engagement_points)::INTEGER
  INTO reputation_score
  FROM user_stats us;

  -- Update user reputation
  UPDATE users
  SET
    reputation_score = COALESCE(reputation_score, 0),
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Process weekly rewards
CREATE OR REPLACE FUNCTION calculate_weekly_rewards(week_start_date DATE)
RETURNS UUID AS $$
DECLARE
  week_end_date DATE;
  total_pool DECIMAL;
  reward_id UUID;
  distribution_percentage DECIMAL;
BEGIN
  week_end_date := week_start_date + INTERVAL '6 days';

  -- Get distribution percentage from config
  SELECT (value::TEXT)::DECIMAL INTO distribution_percentage
  FROM system_config WHERE key = 'weekly_distribution_percentage';

  -- Calculate total pool from submissions during the week
  SELECT COALESCE(SUM(submission_amount), 0) * (distribution_percentage / 100)
  INTO total_pool
  FROM resources
  WHERE created_at >= week_start_date::TIMESTAMP
    AND created_at <= (week_end_date + INTERVAL '1 day')::TIMESTAMP
    AND submission_tx_hash IS NOT NULL;

  -- Create weekly reward record
  INSERT INTO weekly_rewards (week_start, week_end, total_pool_amount)
  VALUES (week_start_date, week_end_date, total_pool)
  RETURNING id INTO reward_id;

  -- Calculate and insert reward distributions for top content
  WITH ranked_content AS (
    SELECT
      r.id,
      r.submitted_by,
      r.quality_score,
      ROW_NUMBER() OVER (ORDER BY r.quality_score DESC, r.created_at ASC) as rank
    FROM resources r
    WHERE r.created_at >= week_start_date::TIMESTAMP
      AND r.created_at <= (week_end_date + INTERVAL '1 day')::TIMESTAMP
      AND r.status = 'approved'
      AND r.quality_score > 0
    LIMIT 10
  ),
  reward_amounts AS (
    SELECT
      *,
      CASE rank
        WHEN 1 THEN total_pool * 0.30  -- 30% to #1
        WHEN 2 THEN total_pool * 0.20  -- 20% to #2
        WHEN 3 THEN total_pool * 0.15  -- 15% to #3
        WHEN 4 THEN total_pool * 0.10  -- 10% to #4
        WHEN 5 THEN total_pool * 0.08  -- 8% to #5
        ELSE total_pool * 0.034         -- 3.4% to #6-10 (17% total)
      END as reward_amount
    FROM ranked_content
  )
  INSERT INTO reward_distributions (weekly_reward_id, user_id, resource_id, amount, rank, quality_score)
  SELECT reward_id, submitted_by, id, reward_amount, rank, quality_score
  FROM reward_amounts;

  -- Mark calculation as completed
  UPDATE weekly_rewards
  SET calculation_completed_at = NOW()
  WHERE id = reward_id;

  RETURN reward_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update resource scores when votes change
CREATE OR REPLACE FUNCTION trigger_update_resource_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scores for the affected resource
  PERFORM update_resource_scores(COALESCE(NEW.resource_id, OLD.resource_id));

  -- Update user reputation for voters
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_user_reputation(NEW.user_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_reputation(OLD.user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_scores_on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_resource_scores();

-- Create a scheduled function to update trending scores (run via cron)
CREATE OR REPLACE FUNCTION scheduled_update_trending_scores()
RETURNS VOID AS $$
BEGIN
  PERFORM update_trending_scores();

  -- Log the update
  INSERT INTO analytics_events (event_type, properties)
  VALUES ('trending_scores_updated', '{"timestamp": "' || NOW() || '"}');
END;
$$ LANGUAGE plpgsql;
