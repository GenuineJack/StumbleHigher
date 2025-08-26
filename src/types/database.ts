export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          farcaster_id: string | null
          farcaster_username: string | null
          eth_address: string | null
          email: string | null
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          reputation_score: number
          total_submissions: number
          total_upvotes: number
          total_downvotes: number
          total_rewards_earned: number
          is_admin: boolean
          is_suspended: boolean
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farcaster_id?: string | null
          farcaster_username?: string | null
          eth_address?: string | null
          email?: string | null
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          reputation_score?: number
          total_submissions?: number
          total_upvotes?: number
          total_downvotes?: number
          total_rewards_earned?: number
          is_admin?: boolean
          is_suspended?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farcaster_id?: string | null
          farcaster_username?: string | null
          eth_address?: string | null
          email?: string | null
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          reputation_score?: number
          total_submissions?: number
          total_upvotes?: number
          total_downvotes?: number
          total_rewards_earned?: number
          is_admin?: boolean
          is_suspended?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          title: string
          author: string | null
          url: string
          description: string | null
          category: string
          tags: string[] | null
          difficulty_level: string | null
          estimated_time_minutes: number | null
          submitted_by: string | null
          submission_tx_hash: string | null
          submission_amount: number
          status: string
          upvotes: number
          downvotes: number
          views: number
          unique_viewers: number
          quality_score: number
          trending_score: number
          last_viewed_at: string | null
          featured: boolean
          featured_at: string | null
          admin_notes: string | null
          rejection_reason: string | null
          is_genesis: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          author?: string | null
          url: string
          description?: string | null
          category: string
          tags?: string[] | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          submitted_by?: string | null
          submission_tx_hash?: string | null
          submission_amount?: number
          status?: string
          upvotes?: number
          downvotes?: number
          views?: number
          unique_viewers?: number
          quality_score?: number
          trending_score?: number
          last_viewed_at?: string | null
          featured?: boolean
          featured_at?: string | null
          admin_notes?: string | null
          rejection_reason?: string | null
          is_genesis?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string | null
          url?: string
          description?: string | null
          category?: string
          tags?: string[] | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          submitted_by?: string | null
          submission_tx_hash?: string | null
          submission_amount?: number
          status?: string
          upvotes?: number
          downvotes?: number
          views?: number
          unique_viewers?: number
          quality_score?: number
          trending_score?: number
          last_viewed_at?: string | null
          featured?: boolean
          featured_at?: string | null
          admin_notes?: string | null
          rejection_reason?: string | null
          is_genesis?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_submitted_by_fkey"
            columns: ["submitted_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      votes: {
        Row: {
          id: string
          resource_id: string
          user_id: string
          vote_type: string
          weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          user_id: string
          vote_type: string
          weight?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          user_id?: string
          vote_type?: string
          weight?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_interactions: {
        Row: {
          id: string
          user_id: string | null
          resource_id: string | null
          interaction_type: string
          session_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          resource_id?: string | null
          interaction_type: string
          session_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          resource_id?: string | null
          interaction_type?: string
          session_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_categories: string[]
          excluded_categories: string[]
          preferred_difficulty: string
          max_time_minutes: number
          hide_videos: boolean
          hide_long_content: boolean
          notification_settings: Json
          discovery_algorithm: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_categories?: string[]
          excluded_categories?: string[]
          preferred_difficulty?: string
          max_time_minutes?: number
          hide_videos?: boolean
          hide_long_content?: boolean
          notification_settings?: Json
          discovery_algorithm?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_categories?: string[]
          excluded_categories?: string[]
          preferred_difficulty?: string
          max_time_minutes?: number
          hide_videos?: boolean
          hide_long_content?: boolean
          notification_settings?: Json
          discovery_algorithm?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          }
        ]
      }
      weekly_rewards: {
        Row: {
          id: string
          week_start: string
          week_end: string
          total_pool_amount: number
          total_submissions: number
          total_participants: number
          calculation_completed_at: string | null
          distribution_completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          week_start: string
          week_end: string
          total_pool_amount: number
          total_submissions?: number
          total_participants?: number
          calculation_completed_at?: string | null
          distribution_completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          week_start?: string
          week_end?: string
          total_pool_amount?: number
          total_submissions?: number
          total_participants?: number
          calculation_completed_at?: string | null
          distribution_completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reward_distributions: {
        Row: {
          id: string
          weekly_reward_id: string
          user_id: string
          resource_id: string
          amount: number
          rank: number | null
          quality_score: number | null
          tx_hash: string | null
          distributed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          weekly_reward_id: string
          user_id: string
          resource_id: string
          amount: number
          rank?: number | null
          quality_score?: number | null
          tx_hash?: string | null
          distributed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          weekly_reward_id?: string
          user_id?: string
          resource_id?: string
          amount?: number
          rank?: number | null
          quality_score?: number | null
          tx_hash?: string | null
          distributed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_distributions_weekly_reward_id_fkey"
            columns: ["weekly_reward_id"]
            referencedRelation: "weekly_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_distributions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_distributions_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          resource_id: string
          reported_by: string
          reason: string
          description: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          reported_by: string
          reason: string
          description?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          reported_by?: string
          reason?: string
          description?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_by_fkey"
            columns: ["reported_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_events: {
        Row: {
          id: string
          event_type: string
          user_id: string | null
          resource_id: string | null
          session_id: string | null
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_id?: string | null
          resource_id?: string | null
          session_id?: string | null
          properties?: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_id?: string | null
          resource_id?: string | null
          session_id?: string | null
          properties?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "resources"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string | null
          target_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_config: {
        Row: {
          id: string
          key: string
          value: Json
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_quality_score: {
        Args: {
          resource_id: string
        }
        Returns: {
          upvotes: number
          downvotes: number
          weighted_score: number
          voter_count: number
          should_auto_approve: boolean
          should_auto_hide: boolean
        }[]
      }
      get_personalized_recommendations: {
        Args: {
          target_user_id: string
          limit_count?: number
          exclude_viewed?: boolean
        }
        Returns: {
          resource_id: string
          relevance_score: number
        }[]
      }
      get_random_stumble_content: {
        Args: {
          limit_count?: number
          exclude_ids?: string[]
        }
        Returns: {
          resource_id: string
          random_score: number
        }[]
      }
      update_resource_scores: {
        Args: {
          resource_id: string
        }
        Returns: void
      }
      update_trending_scores: {
        Args: {}
        Returns: void
      }
      update_user_reputation: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      calculate_weekly_rewards: {
        Args: {
          week_start_date: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Additional type definitions for application use
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Resource = Database['public']['Tables']['resources']['Row'];
export type ResourceInsert = Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdate = Database['public']['Tables']['resources']['Update'];

export type Vote = Database['public']['Tables']['votes']['Row'];
export type VoteInsert = Database['public']['Tables']['votes']['Insert'];

export type UserInteraction = Database['public']['Tables']['user_interactions']['Row'];
export type UserInteractionInsert = Database['public']['Tables']['user_interactions']['Insert'];

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type WeeklyReward = Database['public']['Tables']['weekly_rewards']['Row'];
export type RewardDistribution = Database['public']['Tables']['reward_distributions']['Row'];
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];
export type AdminAction = Database['public']['Tables']['admin_actions']['Row'];
export type SystemConfig = Database['public']['Tables']['system_config']['Row'];

// Extended types with relations
export interface ResourceWithSubmitter extends Resource {
  submitted_by: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ResourceWithVotes extends ResourceWithSubmitter {
  user_vote?: 'up' | 'down' | null;
  is_favorited?: boolean;
}

export interface UserWithStats extends User {
  submission_count?: number;
  favorite_count?: number;
  recent_activity?: UserInteraction[];
}

// Utility types
export type ResourceCategory = 'books' | 'articles' | 'videos' | 'tools' | 'research' | 'philosophy';
export type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type VoteType = 'up' | 'down';
export type InteractionType = 'view' | 'favorite' | 'share' | 'complete' | 'click_through';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type DiscoveryAlgorithm = 'balanced' | 'popular' | 'recent' | 'personalized';
export type ReportReason = 'spam' | 'inappropriate' | 'broken_link' | 'duplicate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
  farcaster_id?: string;
  eth_address?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Quality score calculation result
export interface QualityScoreResult {
  upvotes: number;
  downvotes: number;
  weighted_score: number;
  voter_count: number;
  should_auto_approve: boolean;
  should_auto_hide: boolean;
}

// Personalized recommendation result
export interface PersonalizedRecommendation {
  resource_id: string;
  relevance_score: number;
  resource?: ResourceWithSubmitter;
}

// Analytics event properties
export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null;
}

export default Database;
