export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          slug: string
        }
        Update: {
          name?: string
          slug?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          organization_id: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          organization_id?: string
          role?: string
        }
        Update: {
          full_name?: string
          organization_id?: string
          role?: string
        }
      }
      objectives: {
        Row: {
          id: string
          title: string
          description: string | null
          organization_id: string
          owner_id: string
          start_date: string
          end_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string
          organization_id: string
          owner_id: string
          start_date: string
          end_date: string
          status?: string
        }
        Update: {
          title?: string
          description?: string
          start_date?: string
          end_date?: string
          status?: string
        }
      }
      key_results: {
        Row: {
          id: string
          title: string
          description: string | null
          objective_id: string
          organization_id: string
          target_value: number
          current_value: number
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string
          objective_id: string
          organization_id: string
          target_value: number
          current_value?: number
          unit?: string
        }
        Update: {
          title?: string
          description?: string
          target_value?: number
          current_value?: number
          unit?: string
        }
      }
    }
  }
}