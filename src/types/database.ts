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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          series_type: 'black_cup' | 'numbering' | 'rise' | 'other'
          date: string
          status?: 'upcoming' | 'live' | 'completed'
          mvp_video_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          series_type?: 'black_cup' | 'numbering' | 'rise' | 'other'
          date?: string
          status?: 'upcoming' | 'live' | 'completed'
          mvp_video_url?: string | null
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
          status: 'upcoming' | 'completed' | 'cancelled'
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
