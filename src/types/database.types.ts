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
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'owner' | 'admin' | 'viewer'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'owner' | 'admin' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'owner' | 'admin' | 'viewer'
          created_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          tags: string[]
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          name: string
          slug: string
          source_id: string | null
          description: string | null
          tags: string[]
          active: boolean
          start_at: string | null
          end_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          source_id?: string | null
          description?: string | null
          tags?: string[]
          active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          source_id?: string | null
          description?: string | null
          tags?: string[]
          active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_s_fkey"
            columns: ["s"]
            isOneToOne: false
            referencedRelation: "o"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_s_fkey"
            columns: ["s"]
            isOneToOne: false
            referencedRelation: "o"
            referencedColumns: ["id"]
          }
        ]
      }
      devices: {
        Row: {
          id: string
          name: string
          code: string
          model: string | null
          description: string | null
          tags: string[]
          active: boolean
          maintenance: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          model?: string | null
          description?: string | null
          tags?: string[]
          active?: boolean
          maintenance?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          model?: string | null
          description?: string | null
          tags?: string[]
          active?: boolean
          maintenance?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          id: string
          device_id: string
          name: string
          type: 'whatsapp' | 'telegram' | 'website' | 'other'
          url: string
          phone_number: string | null
          weight: number
          tags: string[]
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          name: string
          type?: 'whatsapp' | 'telegram' | 'website' | 'other'
          url: string
          phone_number?: string | null
          weight?: number
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          name?: string
          type?: 'whatsapp' | 'telegram' | 'website' | 'other'
          url?: string
          phone_number?: string | null
          weight?: number
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_d_fkey"
            columns: ["d"]
            isOneToOne: false
            referencedRelation: "e"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_d_fkey"
            columns: ["d"]
            isOneToOne: false
            referencedRelation: "e"
            referencedColumns: ["id"]
          }
        ]
      }
      links: {
        Row: {
          id: string
          name: string
          slug: string
          source_id: string | null
          campaign_id: string | null
          strategy: 'round_robin' | 'random' | 'weighted'
          destination_strategy: 'round_robin' | 'random' | 'weighted'
          fallback_url: string | null
          expires_at: string | null
          tags: string[]
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          source_id?: string | null
          campaign_id?: string | null
          strategy?: 'round_robin' | 'random' | 'weighted'
          destination_strategy?: 'round_robin' | 'random' | 'weighted'
          fallback_url?: string | null
          expires_at?: string | null
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          source_id?: string | null
          campaign_id?: string | null
          strategy?: 'round_robin' | 'random' | 'weighted'
          destination_strategy?: 'round_robin' | 'random' | 'weighted'
          fallback_url?: string | null
          expires_at?: string | null
          tags?: string[]
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      link_devices: {
        Row: {
          id: string
          link_id: string
          device_id: string
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          device_id: string
          weight?: number
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          device_id?: string
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_devices_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      clicks: {
        Row: {
          id: string
          link_id: string | null
          source_id: string | null
          campaign_id: string | null
          device_id: string | null
          destination_id: string | null
          session_id: string | null
          ip_hash: string
          user_agent: string | null
          referer: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          country: string | null
          created_at: string
        }
        Insert: {
          id?: string
          link_id?: string | null
          source_id?: string | null
          campaign_id?: string | null
          device_id?: string | null
          destination_id?: string | null
          session_id?: string | null
          ip_hash: string
          user_agent?: string | null
          referer?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string | null
          source_id?: string | null
          campaign_id?: string | null
          device_id?: string | null
          destination_id?: string | null
          session_id?: string | null
          ip_hash?: string
          user_agent?: string | null
          referer?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      round_robin_state: {
        Row: {
          entity_key: string
          last_index: number
          updated_at: string
        }
        Insert: {
          entity_key: string
          last_index?: number
          updated_at?: string
        }
        Update: {
          entity_key?: string
          last_index?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
