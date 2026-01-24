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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          issue_note: string | null
          issue_photo_url: string | null
          job_id: string
          room_name: string
          sort_order: number
          status: string
          task_name: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          issue_note?: string | null
          issue_photo_url?: string | null
          job_id: string
          room_name: string
          sort_order?: number
          status?: string
          task_name: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          issue_note?: string | null
          issue_photo_url?: string | null
          job_id?: string
          room_name?: string
          sort_order?: number
          status?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          tasks: Json
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tasks?: Json
          template_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tasks?: Json
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          access_codes: string | null
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          portal_token: string | null
          portal_token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_codes?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_codes?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          job_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          job_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          job_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          job_id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          job_id: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          job_id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          created_at: string
          id: string
          job_id: string
          photo_type: string
          photo_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          photo_type?: string
          photo_url: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_staff_id: string | null
          checkin_distance_meters: number | null
          checkin_lat: number | null
          checkin_lng: number | null
          checklist: Json | null
          checkout_distance_meters: number | null
          checkout_lat: number | null
          checkout_lng: number | null
          client_id: string | null
          created_at: string
          end_time: string | null
          geofence_validated: boolean | null
          id: string
          location: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          photo_urls: Json | null
          property_id: string | null
          quality_score: number | null
          scheduled_date: string
          scheduled_time: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          checkin_distance_meters?: number | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checklist?: Json | null
          checkout_distance_meters?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          geofence_validated?: boolean | null
          id?: string
          location: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: Json | null
          property_id?: string | null
          quality_score?: number | null
          scheduled_date: string
          scheduled_time: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          checkin_distance_meters?: number | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checklist?: Json | null
          checkout_distance_meters?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          geofence_validated?: boolean | null
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: Json | null
          property_id?: string | null
          quality_score?: number | null
          scheduled_date?: string
          scheduled_time?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_job_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_job_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_job_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_log: {
        Row: {
          accessed_at: string
          action: string | null
          client_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          action?: string | null
          client_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          action?: string | null
          client_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          description: string | null
          file_type: string
          file_url: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          certifications: Json | null
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          phone: string | null
          skills: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certifications?: Json | null
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          skills?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certifications?: Json | null
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          skills?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles_sensitive: {
        Row: {
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hourly_rate: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hourly_rate?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hourly_rate?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_codes: string | null
          address: string
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          client_id: string | null
          created_at: string
          default_checklist_template_id: string | null
          dining_chairs: number | null
          estimated_hours: number | null
          floor_type: string | null
          floors: number | null
          geofence_radius_meters: number
          has_garage: boolean | null
          has_pets: boolean | null
          has_pool: boolean | null
          id: string
          is_active: boolean
          living_areas: number | null
          location_lat: number | null
          location_lng: number | null
          name: string
          pet_details: string | null
          property_type: string
          rugs: number | null
          size_sqm: number | null
          sofas: number | null
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          access_codes?: string | null
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          client_id?: string | null
          created_at?: string
          default_checklist_template_id?: string | null
          dining_chairs?: number | null
          estimated_hours?: number | null
          floor_type?: string | null
          floors?: number | null
          geofence_radius_meters?: number
          has_garage?: boolean | null
          has_pets?: boolean | null
          has_pool?: boolean | null
          id?: string
          is_active?: boolean
          living_areas?: number | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          pet_details?: string | null
          property_type?: string
          rugs?: number | null
          size_sqm?: number | null
          sofas?: number | null
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          access_codes?: string | null
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          client_id?: string | null
          created_at?: string
          default_checklist_template_id?: string | null
          dining_chairs?: number | null
          estimated_hours?: number | null
          floor_type?: string | null
          floors?: number | null
          geofence_radius_meters?: number
          has_garage?: boolean | null
          has_pets?: boolean | null
          has_pool?: boolean | null
          id?: string
          is_active?: boolean
          living_areas?: number | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          pet_details?: string | null
          property_type?: string
          rugs?: number | null
          size_sqm?: number | null
          sofas?: number | null
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_default_checklist_template_id_fkey"
            columns: ["default_checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_url: string
          property_id: string
          room_area: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url: string
          property_id: string
          room_area?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string
          property_id?: string
          room_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          assigned_staff_id: string | null
          checklist: Json | null
          client_id: string | null
          created_at: string
          day_of_month: number | null
          days_of_week: number[] | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          location: string
          next_generation_date: string | null
          notes: string | null
          property_id: string | null
          scheduled_time: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          checklist?: Json | null
          client_id?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          frequency: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location: string
          next_generation_date?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_time?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          checklist?: Json | null
          client_id?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location?: string
          next_generation_date?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_login_rate_limit: {
        Args: { p_email: string }
        Returns: {
          block_expires_at: string
          failed_attempts: number
          is_blocked: boolean
        }[]
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_job_id?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_client_for_job: {
        Args: { _job_id: string }
        Returns: {
          address: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
        }[]
      }
      get_client_portal_data: {
        Args: { p_token: string }
        Returns: {
          client_id: string
          client_name: string
          end_time: string
          id: string
          location: string
          notes: string
          photos: Json
          property_name: string
          scheduled_date: string
          scheduled_time: string
          staff_name: string
          start_time: string
          status: string
        }[]
      }
      get_clients_safe: {
        Args: never
        Returns: {
          address: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }[]
      }
      get_job_access_code: { Args: { _job_id: string }; Returns: string }
      get_login_attempts_for_monitoring: {
        Args: { p_hours?: number }
        Returns: {
          attempted_at: string
          email: string
          ip_address: string
          success: boolean
        }[]
      }
      get_profiles_safe: {
        Args: never
        Returns: {
          certifications: Json
          created_at: string
          email: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          phone: string
          skills: Json
          updated_at: string
          user_id: string
        }[]
      }
      get_properties_safe: {
        Args: never
        Returns: {
          address: string
          client_id: string
          created_at: string
          default_checklist_template_id: string
          geofence_radius_meters: number
          id: string
          is_active: boolean
          location_lat: number
          location_lng: number
          name: string
          property_type: string
          size_sqm: number
          special_instructions: string
          updated_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_assigned_to_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      promote_user_to_admin: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      record_login_attempt: {
        Args: { p_email: string; p_ip_address?: string; p_success: boolean }
        Returns: undefined
      }
      rotate_client_portal_token: {
        Args: { p_client_id: string; p_validity_days?: number }
        Returns: string
      }
      validate_client_portal_access: {
        Args: { p_client_id: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
