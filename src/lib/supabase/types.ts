// Generated database types — kept in sync with supabase/migrations/0000_initial.sql
// Re-run `npx supabase gen types typescript` after schema changes in Phase 2+.

export type DonorSegment = "Major Gifts" | "Mid-Level" | "Sustainer" | "First-Time" | "Lapsed" | "General";
export type GiftChannel   = "Email" | "Direct Mail" | "Event" | "Online" | "Phone";
export type GiftRegion    = "Midwest" | "Northeast" | "West" | "South";
export type UploadStatus  = "pending" | "processing" | "complete" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          uploaded_at: string;
          row_count: number;
          rejected_count: number;
          status: UploadStatus;
          storage_path: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          uploaded_at?: string;
          row_count?: number;
          rejected_count?: number;
          status?: UploadStatus;
          storage_path?: string | null;
        };
        Update: {
          row_count?: number;
          rejected_count?: number;
          status?: UploadStatus;
          storage_path?: string | null;
        };
      };
      donor_gifts: {
        Row: {
          id: string;
          upload_id: string;
          user_id: string;
          donor_id: string;
          donor_name: string;
          segment: DonorSegment | null;
          gift_date: string | null;
          gift_amount: number | null;
          campaign: string | null;
          channel: GiftChannel | null;
          region: GiftRegion | null;
          is_valid: boolean;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          upload_id: string;
          user_id: string;
          donor_id: string;
          donor_name: string;
          segment?: DonorSegment | null;
          gift_date?: string | null;
          gift_amount?: number | null;
          campaign?: string | null;
          channel?: GiftChannel | null;
          region?: GiftRegion | null;
          is_valid?: boolean;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          is_valid?: boolean;
          rejection_reason?: string | null;
        };
      };
    };
    Enums: {
      donor_segment: DonorSegment;
      gift_channel: GiftChannel;
      gift_region: GiftRegion;
      upload_status: UploadStatus;
    };
  };
}
