// Auto-generated from Supabase project olrmtazyepkxjyecfyba
// Regenerate with: mcp__supabase__generate_typescript_types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      donor_gifts: {
        Row: {
          campaign: string | null
          channel: string | null
          created_at: string
          donor_id: string
          donor_name: string | null
          gift_amount: number
          gift_date: string
          id: string
          is_valid: boolean
          region: string | null
          rejection_reason: string | null
          segment: string | null
          upload_id: string
          user_id: string
        }
        Insert: {
          campaign?: string | null
          channel?: string | null
          created_at?: string
          donor_id: string
          donor_name?: string | null
          gift_amount: number
          gift_date: string
          id?: string
          is_valid?: boolean
          region?: string | null
          rejection_reason?: string | null
          segment?: string | null
          upload_id: string
          user_id: string
        }
        Update: {
          campaign?: string | null
          channel?: string | null
          created_at?: string
          donor_id?: string
          donor_name?: string | null
          gift_amount?: number
          gift_date?: string
          id?: string
          is_valid?: boolean
          region?: string | null
          rejection_reason?: string | null
          segment?: string | null
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_gifts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          error_message: string | null
          filename: string
          id: string
          rejected_count: number
          row_count: number
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          rejected_count?: number
          row_count?: number
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          rejected_count?: number
          row_count?: number
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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

// Convenience aliases for domain types
export type DonorSegment = "Major Gifts" | "Mid-Level" | "Sustainer" | "First-Time" | "Lapsed" | "General";
export type GiftChannel  = "Email" | "Direct Mail" | "Event" | "Online" | "Phone";
export type GiftRegion   = "Midwest" | "Northeast" | "West" | "South";
export type UploadStatus = "processing" | "complete" | "error";
