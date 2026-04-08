export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          ring_name: string
          wins: number
          losses: number
          current_streak: number
          best_streak: number
          hall_of_fame_count: number
          score: number
          p4p_score: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          ring_name: string
          wins?: number
          losses?: number
          current_streak?: number
          best_streak?: number
          hall_of_fame_count?: number
          score?: number
          p4p_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          ring_name?: string
          wins?: number
          losses?: number
          current_streak?: number
          best_streak?: number
          hall_of_fame_count?: number
          score?: number
          p4p_score?: number
          created_at?: string
        }
        Relationships: []
      }
      fighters: {
        Row: {
          id: string
          name: string
          ring_name: string | null
          name_en: string | null
          name_ko: string | null
          record: string | null
          nationality: string | null
          weight_class: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          ring_name?: string | null
          name_en?: string | null
          name_ko?: string | null
          record?: string | null
          nationality?: string | null
          weight_class?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          ring_name?: string | null
          name_en?: string | null
          name_ko?: string | null
          record?: string | null
          nationality?: string | null
          weight_class?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          name: string
          series_type: 'black_cup' | 'numbering' | 'rise' | 'other'
          date: string
          status: 'upcoming' | 'live' | 'completed'
          mvp_video_url: string | null
          poster_url: string | null
          source_event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          series_type: 'black_cup' | 'numbering' | 'rise' | 'other'
          date: string
          status?: 'upcoming' | 'live' | 'completed'
          mvp_video_url?: string | null
          poster_url?: string | null
          source_event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          series_type?: 'black_cup' | 'numbering' | 'rise' | 'other'
          date?: string
          status?: 'upcoming' | 'live' | 'completed'
          mvp_video_url?: string | null
          poster_url?: string | null
          source_event_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      fights: {
        Row: {
          id: string
          event_id: string
          fighter_a_id: string
          fighter_b_id: string
          start_time: string
          status: 'upcoming' | 'completed' | 'cancelled' | 'no_contest'
          winner_id: string | null
          method: 'KO/TKO' | 'Submission' | 'Decision' | null
          round: number | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          fighter_a_id: string
          fighter_b_id: string
          start_time: string
          status?: 'upcoming' | 'completed' | 'cancelled'
          winner_id?: string | null
          method?: 'KO/TKO' | 'Submission' | 'Decision' | null
          round?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          fighter_a_id?: string
          fighter_b_id?: string
          start_time?: string
          status?: 'upcoming' | 'completed' | 'cancelled'
          winner_id?: string | null
          method?: 'KO/TKO' | 'Submission' | 'Decision' | null
          round?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fights_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fights_fighter_a_id_fkey'
            columns: ['fighter_a_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fights_fighter_b_id_fkey'
            columns: ['fighter_b_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fights_winner_id_fkey'
            columns: ['winner_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          }
        ]
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          fight_id: string
          winner_id: string
          method: 'KO/TKO' | 'Submission' | 'Decision' | null
          round: number | null
          created_at: string
          updated_at: string
          is_winner_correct: boolean | null
          is_method_correct: boolean | null
          is_round_correct: boolean | null
          score: number | null
        }
        Insert: {
          id?: string
          user_id: string
          fight_id: string
          winner_id: string
          method?: 'KO/TKO' | 'Submission' | 'Decision' | null
          round?: number | null
          created_at?: string
          updated_at?: string
          is_winner_correct?: boolean | null
          is_method_correct?: boolean | null
          is_round_correct?: boolean | null
          score?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          fight_id?: string
          winner_id?: string
          method?: 'KO/TKO' | 'Submission' | 'Decision' | null
          round?: number | null
          created_at?: string
          updated_at?: string
          is_winner_correct?: boolean | null
          is_method_correct?: boolean | null
          is_round_correct?: boolean | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'predictions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_fight_id_fkey'
            columns: ['fight_id']
            isOneToOne: false
            referencedRelation: 'fights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_winner_id_fkey'
            columns: ['winner_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          }
        ]
      }
      mvp_votes: {
        Row: {
          id: string
          user_id: string
          event_id: string
          fighter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          fighter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          fighter_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mvp_votes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mvp_votes_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mvp_votes_fighter_id_fkey'
            columns: ['fighter_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          }
        ]
      }
      fight_comments: {
        Row: {
          id: string
          fight_id: string
          user_id: string
          parent_id: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          fight_id: string
          user_id: string
          parent_id?: string | null
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          fight_id?: string
          user_id?: string
          parent_id?: string | null
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fight_comments_fight_id_fkey'
            columns: ['fight_id']
            isOneToOne: false
            referencedRelation: 'fights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fight_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fight_comments_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'fight_comments'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'fight_start' | 'result' | 'mvp_vote' | 'ranking_change'
          title: string
          body: string
          reference_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'fight_start' | 'result' | 'mvp_vote' | 'ranking_change'
          title: string
          body: string
          reference_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'fight_start' | 'result' | 'mvp_vote' | 'ranking_change'
          title?: string
          body?: string
          reference_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      comment_translations: {
        Row: {
          id: string
          comment_id: string
          target_locale: 'en' | 'ko' | 'ja' | 'pt-BR'
          translated_body: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          target_locale: 'en' | 'ko' | 'ja' | 'pt-BR'
          translated_body: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          target_locale?: 'en' | 'ko' | 'ja' | 'pt-BR'
          translated_body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_translations_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'fight_comments'
            referencedColumns: ['id']
          }
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_likes_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'fight_comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_weight_class_stats: {
        Row: {
          id: string
          user_id: string
          weight_class: string
          wins: number
          losses: number
          score: number
        }
        Insert: {
          id?: string
          user_id: string
          weight_class: string
          wins?: number
          losses?: number
          score?: number
        }
        Update: {
          id?: string
          user_id?: string
          weight_class?: string
          wins?: number
          losses?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: 'user_weight_class_stats_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      hall_of_fame_entries: {
        Row: {
          id: string
          user_id: string
          fight_id: string
          tier: 'sharp_call' | 'sniper' | 'oracle'
          bonus_points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fight_id: string
          tier: 'sharp_call' | 'sniper' | 'oracle'
          bonus_points: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fight_id?: string
          tier?: 'sharp_call' | 'sniper' | 'oracle'
          bonus_points?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hall_of_fame_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hall_of_fame_entries_fight_id_fkey'
            columns: ['fight_id']
            isOneToOne: false
            referencedRelation: 'fights'
            referencedColumns: ['id']
          }
        ]
      }
      perfect_card_entries: {
        Row: {
          id: string
          user_id: string
          event_id: string
          bonus_points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          bonus_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          bonus_points?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'perfect_card_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'perfect_card_entries_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      rankings: {
        Row: {
          id: string
          type: 'series' | 'event'
          reference_id: string
          user_id: string
          score: number
          rank: number
        }
        Insert: {
          id?: string
          type: 'series' | 'event'
          reference_id: string
          user_id: string
          score?: number
          rank: number
        }
        Update: {
          id?: string
          type?: 'series' | 'event'
          reference_id?: string
          user_id?: string
          score?: number
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: 'rankings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      fighter_comments: {
        Row: {
          id: string
          fighter_id: string
          user_id: string
          parent_id: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          fighter_id: string
          user_id: string
          parent_id?: string | null
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          fighter_id?: string
          user_id?: string
          parent_id?: string | null
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fighter_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fighter_comments_fighter_id_fkey'
            columns: ['fighter_id']
            isOneToOne: false
            referencedRelation: 'fighters'
            referencedColumns: ['id']
          }
        ]
      }
      fighter_comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fighter_comment_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_prediction_score: {
        Args: {
          p_is_winner_correct: boolean
          p_predicted_method: 'KO/TKO' | 'Submission' | 'Decision' | null
          p_is_method_correct: boolean | null
          p_predicted_round: number | null
          p_is_round_correct: boolean | null
        }
        Returns: number
      }
      process_fight_result: {
        Args: {
          p_fight_id: string
        }
        Returns: undefined
      }
      get_streak_multiplier: {
        Args: {
          p_streak: number
        }
        Returns: number
      }
      calculate_p4p_score: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      recalculate_all_scores: {
        Args: Record<string, never>
        Returns: undefined
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
