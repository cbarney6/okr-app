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
      // ADD THIS NEW SESSIONS TABLE TO YOUR EXISTING DATABASE INTERFACE
      sessions: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          parent_session_id: string | null
          organization_id: string
          status: 'open' | 'in_progress' | 'archived'
          color: string
          cadence: 'weekly' | 'every_two_weeks' | 'monthly'
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string
          start_date: string
          end_date: string
          parent_session_id?: string
          organization_id: string
          status?: 'open' | 'in_progress' | 'archived'
          color?: string
          cadence?: 'weekly' | 'every_two_weeks' | 'monthly'
        }
        Update: {
          name?: string
          description?: string
          start_date?: string
          end_date?: string
          parent_session_id?: string
          status?: 'open' | 'in_progress' | 'archived'
          color?: string
          cadence?: 'weekly' | 'every_two_weeks' | 'monthly'
        }
      }
    }
  }
}

// ADD THESE NEW INTERFACES FOR COMPONENT USE
export interface Session {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  parent_session_id?: string
  organization_id: string
  status: 'open' | 'in_progress' | 'archived'
  color: string
  cadence: 'weekly' | 'every_two_weeks' | 'monthly'
  created_at: string
  updated_at: string
  parent_session?: {
    id: string
    name: string
  }
  child_sessions?: { count: number }[]
}
