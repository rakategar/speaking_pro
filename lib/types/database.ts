export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analysis_metrics: {
        Row: {
          id: string
          recording_id: string | null
          user_id: string | null
          status: string
          error: string | null
          audio_bytes: number | null
          duration_seconds: number | null
          asr_ms: number | null
          prosody_ms: number | null
          llm_ms: number | null
          total_ms: number | null
          asr_model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recording_id?: string | null
          user_id?: string | null
          status: string
          error?: string | null
          audio_bytes?: number | null
          duration_seconds?: number | null
          asr_ms?: number | null
          prosody_ms?: number | null
          llm_ms?: number | null
          total_ms?: number | null
          asr_model?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recording_id?: string | null
          user_id?: string | null
          status?: string
          error?: string | null
          audio_bytes?: number | null
          duration_seconds?: number | null
          asr_ms?: number | null
          prosody_ms?: number | null
          llm_ms?: number | null
          total_ms?: number | null
          asr_model?: string | null
          created_at?: string
        }
        Relationships: []
      }
      analysis_jobs: {
        Row: {
          id: string
          recording_id: string
          user_id: string
          status: string
          attempts: number
          last_error: string | null
          next_attempt_at: string
          started_at: string | null
          finished_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recording_id: string
          user_id: string
          status?: string
          attempts?: number
          last_error?: string | null
          next_attempt_at?: string
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recording_id?: string
          user_id?: string
          status?: string
          attempts?: number
          last_error?: string | null
          next_attempt_at?: string
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          scheduled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          scheduled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          scheduled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "coaching_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          avatar_url: string | null
          created_at: string
          headline: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      coaching_products: {
        Row: {
          coach_id: string | null
          created_at: string
          description: string | null
          id: string
          price_idr: number
          title: string
          type: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_idr: number
          title: string
          type: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_idr?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_products_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_idr: number
          created_at: string
          id: string
          payment_method: string | null
          product_id: string | null
          product_type: string
          status: string
          user_id: string
        }
        Insert: {
          amount_idr: number
          created_at?: string
          id?: string
          payment_method?: string | null
          product_id?: string | null
          product_type: string
          status?: string
          user_id: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          product_id?: string | null
          product_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_modules: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          duration_minutes: number
          id: string
          is_ai_recommended: boolean
          slug: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_ai_recommended?: boolean
          slug: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_ai_recommended?: boolean
          slug?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          occupation: string | null
          streak_count: number
          subscription_renews_at: string | null
          subscription_tier: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          occupation?: string | null
          streak_count?: number
          subscription_renews_at?: string | null
          subscription_tier?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          streak_count?: number
          subscription_renews_at?: string | null
          subscription_tier?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          environment: string | null
          id: string
          module_id: string | null
          status: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          environment?: string | null
          id?: string
          module_id?: string | null
          status?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          environment?: string | null
          id?: string
          module_id?: string | null
          status?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "practice_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ai_insights: Json
          clarity_score: number | null
          confidence_score: number | null
          created_at: string
          filler_word_count: number | null
          id: string
          intonation_score: number | null
          next_step_module_id: string | null
          overall_score: number | null
          recording_id: string
          structure_score: number | null
          transcript: string | null
          wpm: number | null
        }
        Insert: {
          ai_insights?: Json
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          filler_word_count?: number | null
          id?: string
          intonation_score?: number | null
          next_step_module_id?: string | null
          overall_score?: number | null
          recording_id: string
          structure_score?: number | null
          transcript?: string | null
          wpm?: number | null
        }
        Update: {
          ai_insights?: Json
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          filler_word_count?: number | null
          id?: string
          intonation_score?: number | null
          next_step_module_id?: string | null
          overall_score?: number | null
          recording_id?: string
          structure_score?: number | null
          transcript?: string | null
          wpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_next_step_module_id_fkey"
            columns: ["next_step_module_id"]
            isOneToOne: false
            referencedRelation: "practice_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          id: string
          overall_score: number
          recorded_at: string
          user_id: string
          week_label: string
        }
        Insert: {
          id?: string
          overall_score: number
          recorded_at?: string
          user_id: string
          week_label: string
        }
        Update: {
          id?: string
          overall_score?: number
          recorded_at?: string
          user_id?: string
          week_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
