/**
 * Schema types for the Supabase client, matching supabase/migrations/0001_init.sql.
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
          reward_id: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          created_at?: string;
          reward_id?: string | null;
        };
        Update: { reward_id?: string | null };
        Relationships: [];
      };
      rewards: {
        Row: { id: string; member_id: string; redeemed_at: string };
        Insert: { id?: string; member_id: string; redeemed_at?: string };
        Update: { redeemed_at?: string };
        Relationships: [];
      };
    };
    /* Required by supabase-js's GenericSchema constraint, even though this
       schema has no views. */
    Views: Record<never, never>;
    Functions: {
      add_stamp: { Args: { p_member: string }; Returns: number };
      redeem_reward: { Args: { p_member: string }; Returns: string };
      undo_last_stamp: {
        Args: { p_member: string; p_within?: string };
        Returns: boolean;
      };
    };
  };
};
