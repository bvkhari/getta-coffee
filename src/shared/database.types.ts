/**
 * Schema types for the Supabase client, matching the migrations in supabase/.
 *
 * Hand-written so the project typechecks before it is linked to a Supabase
 * project. Once you have linked one you can regenerate this instead:
 *   supabase gen types typescript --linked > lib/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      members: {
        Row: { id: string; name: string; phone: string; created_at: string };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          created_at?: string;
        };
        Update: { id?: string; name?: string; phone?: string };
        Relationships: [];
      };
      stamps: {
        Row: {
          id: string;
          member_id: string;
          created_at: string;
          location: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          created_at?: string;
          location?: string | null;
        };
        Update: { location?: string | null };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          asks_event: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          active?: boolean;
          asks_event?: boolean;
          created_at?: string;
        };
        Update: { name?: string; active?: boolean; asks_event?: boolean };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          member_id: string;
          redeemed_at: string;
          /** Stamps this redemption consumed. The rows themselves are gone. */
          stamps_spent: number;
        };
        Insert: {
          id?: string;
          member_id: string;
          redeemed_at?: string;
          stamps_spent: number;
        };
        Update: { redeemed_at?: string };
        Relationships: [];
      };
    };
    /* Required by supabase-js's GenericSchema constraint, even though this
       schema has no views. */
    Views: Record<never, never>;
    Functions: {
      note_unlock_attempt: {
        Args: { p_ip: string; p_max?: number; p_window?: string };
        Returns: boolean;
      };
      add_stamp: {
        Args: { p_member: string; p_location?: string | null };
        Returns: number;
      };
      redeem_reward: { Args: { p_member: string }; Returns: string };
      undo_last_stamp: {
        Args: { p_member: string; p_within?: string };
        Returns: boolean;
      };
    };
  };
};
