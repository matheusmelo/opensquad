// Auto-generated type stubs — maintained by OpenSquad (not Lovable)
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
      };
      agents: {
        Row: { id: string; name: string; status: string; created_at: string };
        Insert: { id?: string; name: string; status?: string };
        Update: { name?: string; status?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
