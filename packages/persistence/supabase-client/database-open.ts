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
      creed_activity: {
        Row: {
          accent: string | null
          actor: string
          actor_type: string
          actor_user_id: string | null
          after_text: string | null
          before_text: string | null
          change_type: string | null
          confidence: string | null
          created_at: string
          creed_id: string
          event_kind: string
          id: string
          impact: string | null
          proposal_id: string | null
          reason: string | null
          section_id: string | null
          section_name: string | null
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          accent?: string | null
          actor: string
          actor_type: string
          actor_user_id?: string | null
          after_text?: string | null
          before_text?: string | null
          change_type?: string | null
          confidence?: string | null
          created_at?: string
          creed_id: string
          event_kind?: string
          id: string
          impact?: string | null
          proposal_id?: string | null
          reason?: string | null
          section_id?: string | null
          section_name?: string | null
          status: string
          summary: string
          user_id: string
        }
        Update: {
          accent?: string | null
          actor?: string
          actor_type?: string
          actor_user_id?: string | null
          after_text?: string | null
          before_text?: string | null
          change_type?: string | null
          confidence?: string | null
          created_at?: string
          creed_id?: string
          event_kind?: string
          id?: string
          impact?: string | null
          proposal_id?: string | null
          reason?: string | null
          section_id?: string | null
          section_name?: string | null
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_activity_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creed_activity_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "creed_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_ai_settings: {
        Row: {
          ai_mode: string
          api_key_hash: string | null
          api_key_last_four: string | null
          created_at: string
          creed_id: string
          encrypted_api_key: string | null
          key_status: string
          last_validated_at: string | null
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_mode?: string
          api_key_hash?: string | null
          api_key_last_four?: string | null
          created_at?: string
          creed_id: string
          encrypted_api_key?: string | null
          key_status?: string
          last_validated_at?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_mode?: string
          api_key_hash?: string | null
          api_key_last_four?: string | null
          created_at?: string
          creed_id?: string
          encrypted_api_key?: string | null
          key_status?: string
          last_validated_at?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creed_ai_settings_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: true
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_ai_usage: {
        Row: {
          ai_mode: string
          charged_micro_usd: number | null
          created_at: string
          creed_id: string | null
          estimated_cost_usd: number
          feature: string
          id: string
          input_tokens: number
          model_id: string
          model_quality: string
          output_tokens: number
          provider: string
          user_id: string
        }
        Insert: {
          ai_mode?: string
          charged_micro_usd?: number | null
          created_at?: string
          creed_id?: string | null
          estimated_cost_usd?: number
          feature: string
          id: string
          input_tokens?: number
          model_id: string
          model_quality: string
          output_tokens?: number
          provider?: string
          user_id: string
        }
        Update: {
          ai_mode?: string
          charged_micro_usd?: number | null
          created_at?: string
          creed_id?: string | null
          estimated_cost_usd?: number
          feature?: string
          id?: string
          input_tokens?: number
          model_id?: string
          model_quality?: string
          output_tokens?: number
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_ai_usage_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_audit_log: {
        Row: {
          action: string
          created_at: string
          creed_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          creed_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          creed_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creed_audit_log_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_connections: {
        Row: {
          connection_id: string
          created_at: string
          creed_id: string
          last_agent_name: string | null
          last_seen_at: string | null
          observed_via: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          creed_id: string
          last_agent_name?: string | null
          last_seen_at?: string | null
          observed_via?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          creed_id?: string
          last_agent_name?: string | null
          last_seen_at?: string | null
          observed_via?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_connections_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_getting_started: {
        Row: {
          completed_at: string | null
          created_at: string
          creed_id: string
          dismissed_at: string | null
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creed_id: string
          dismissed_at?: string | null
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creed_id?: string
          dismissed_at?: string | null
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_getting_started_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_installation: {
        Row: {
          created_at: string
          owner_user_id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          owner_user_id: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          owner_user_id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      creed_integrations: {
        Row: {
          connected_by: string | null
          created_at: string
          creed_id: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          provider: string
          provider_account_id: string | null
          provider_login: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          connected_by?: string | null
          created_at?: string
          creed_id: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_login?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          connected_by?: string | null
          created_at?: string
          creed_id?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_login?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_integrations_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_mcp_clients: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          creed_id: string
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          creed_id: string
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          creed_id?: string
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_mcp_clients_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_mcp_read_events: {
        Row: {
          client_id: string
          created_at: string
          creed_id: string
          day: string
          read_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creed_id: string
          day: string
          read_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creed_id?: string
          day?: string
          read_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_mcp_read_events_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_members: {
        Row: {
          created_at: string
          creed_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creed_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          creed_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_members_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_proposals: {
        Row: {
          accent: string
          agent_name: string
          author_user_id: string | null
          base_revision: number | null
          change_type: string
          confidence: string
          created_at: string
          creed_id: string
          draft: Json
          id: string
          impact: string
          reason: string
          section_id: string
          section_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent: string
          agent_name: string
          author_user_id?: string | null
          base_revision?: number | null
          change_type: string
          confidence: string
          created_at?: string
          creed_id: string
          draft?: Json
          id: string
          impact: string
          reason: string
          section_id: string
          section_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent?: string
          agent_name?: string
          author_user_id?: string | null
          base_revision?: number | null
          change_type?: string
          confidence?: string
          created_at?: string
          creed_id?: string
          draft?: Json
          id?: string
          impact?: string
          reason?: string
          section_id?: string
          section_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_proposals_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_quality_reports: {
        Row: {
          content_hash: string
          created_at: string
          creed_id: string
          model_id: string
          report: Json
          section_hashes: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          creed_id: string
          model_id: string
          report?: Json
          section_hashes?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          creed_id?: string
          model_id?: string
          report?: Json
          section_hashes?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creed_quality_reports_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: true
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_quality_runs: {
        Row: {
          completed_at: string | null
          content_hash: string
          created_at: string
          credit_balance_usd: number | null
          creed_id: string
          error_message: string | null
          force: boolean
          id: string
          request_key: string
          request_sections: Json | null
          shared_creed_id: string | null
          started_at: string | null
          status: string
          target_section_ids: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_hash: string
          created_at?: string
          credit_balance_usd?: number | null
          creed_id: string
          error_message?: string | null
          force?: boolean
          id?: string
          request_key: string
          request_sections?: Json | null
          shared_creed_id?: string | null
          started_at?: string | null
          status?: string
          target_section_ids?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_hash?: string
          created_at?: string
          credit_balance_usd?: number | null
          creed_id?: string
          error_message?: string | null
          force?: boolean
          id?: string
          request_key?: string
          request_sections?: Json | null
          shared_creed_id?: string | null
          started_at?: string | null
          status?: string
          target_section_ids?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_quality_runs_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creed_quality_runs_shared_creed_id_fkey"
            columns: ["shared_creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_section_versions: {
        Row: {
          accent: string
          actor_type: string
          actor_user_id: string | null
          agent_name: string | null
          cause: string
          content: string
          created_at: string
          creed_id: string
          id: number
          name: string
          revision: number
          section_id: string
        }
        Insert: {
          accent: string
          actor_type: string
          actor_user_id?: string | null
          agent_name?: string | null
          cause: string
          content: string
          created_at?: string
          creed_id: string
          id?: never
          name: string
          revision: number
          section_id: string
        }
        Update: {
          accent?: string
          actor_type?: string
          actor_user_id?: string | null
          agent_name?: string | null
          cause?: string
          content?: string
          created_at?: string
          creed_id?: string
          id?: never
          name?: string
          revision?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_section_versions_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_sections: {
        Row: {
          accent: string
          agent_permission: string
          agent_writable: boolean
          archived_at: string | null
          created_at: string
          creed_id: string
          deleted_at: string | null
          kind: string
          last_edited_at: string
          last_edited_by: string
          last_edited_type: string
          name: string
          payload: Json
          position: number
          revision: number
          section_id: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent: string
          agent_permission?: string
          agent_writable?: boolean
          archived_at?: string | null
          created_at?: string
          creed_id: string
          deleted_at?: string | null
          kind: string
          last_edited_at?: string
          last_edited_by: string
          last_edited_type: string
          name: string
          payload?: Json
          position?: number
          revision?: number
          section_id: string
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent?: string
          agent_permission?: string
          agent_writable?: boolean
          archived_at?: string | null
          created_at?: string
          creed_id?: string
          deleted_at?: string | null
          kind?: string
          last_edited_at?: string
          last_edited_by?: string
          last_edited_type?: string
          name?: string
          payload?: Json
          position?: number
          revision?: number
          section_id?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_sections_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_tokens: {
        Row: {
          created_at: string
          creed_id: string
          direct_edit_token: string | null
          direct_edit_token_hash: string | null
          encrypted_direct_edit_token: string | null
          encrypted_proposal_token: string | null
          encrypted_read_token: string | null
          proposal_token: string | null
          proposal_token_hash: string | null
          read_token: string | null
          read_token_hash: string | null
          require_approval: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creed_id: string
          direct_edit_token?: string | null
          direct_edit_token_hash?: string | null
          encrypted_direct_edit_token?: string | null
          encrypted_proposal_token?: string | null
          encrypted_read_token?: string | null
          proposal_token?: string | null
          proposal_token_hash?: string | null
          read_token?: string | null
          read_token_hash?: string | null
          require_approval?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creed_id?: string
          direct_edit_token?: string | null
          direct_edit_token_hash?: string | null
          encrypted_direct_edit_token?: string | null
          encrypted_proposal_token?: string | null
          encrypted_read_token?: string | null
          proposal_token?: string | null
          proposal_token_hash?: string | null
          read_token?: string | null
          read_token_hash?: string | null
          require_approval?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_tokens_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: true
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creed_version_control: {
        Row: {
          branch: string | null
          configured_by: string | null
          created_at: string
          creed_id: string
          last_remote_committed_at: string | null
          last_remote_message: string | null
          last_remote_sha: string | null
          last_synced_content_hash: string | null
          path: string
          provider: string
          repo_name: string | null
          repo_owner: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          configured_by?: string | null
          created_at?: string
          creed_id: string
          last_remote_committed_at?: string | null
          last_remote_message?: string | null
          last_remote_sha?: string | null
          last_synced_content_hash?: string | null
          path?: string
          provider?: string
          repo_name?: string | null
          repo_owner?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          configured_by?: string | null
          created_at?: string
          creed_id?: string
          last_remote_committed_at?: string | null
          last_remote_message?: string | null
          last_remote_sha?: string | null
          last_synced_content_hash?: string | null
          path?: string
          provider?: string
          repo_name?: string | null
          repo_owner?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creed_version_control_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: true
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
        ]
      }
      creeds: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          onboarding_stage: string | null
          owner_user_id: string
          sync_updated_at: string
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          onboarding_stage?: string | null
          owner_user_id: string
          sync_updated_at?: string
          type: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_stage?: string | null
          owner_user_id?: string
          sync_updated_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_authorization_codes: {
        Row: {
          client_id: string
          code_challenge: string
          code_hash: string
          created_at: string
          creed_grants: Json | null
          expires_at: string
          redirect_uri: string
          resource: string | null
          scope: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          code_challenge: string
          code_hash: string
          created_at?: string
          creed_grants?: Json | null
          expires_at: string
          redirect_uri: string
          resource?: string | null
          scope?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          code_challenge?: string
          code_hash?: string
          created_at?: string
          creed_grants?: Json | null
          expires_at?: string
          redirect_uri?: string
          resource?: string | null
          scope?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          last_used_at: string | null
          redirect_uris: string[]
        }
        Insert: {
          client_id: string
          client_name?: string
          created_at?: string
          last_used_at?: string | null
          redirect_uris?: string[]
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          last_used_at?: string | null
          redirect_uris?: string[]
        }
        Relationships: []
      }
      oauth_token_creeds: {
        Row: {
          creed_id: string
          mode: string
          token_id: string
        }
        Insert: {
          creed_id: string
          mode?: string
          token_id: string
        }
        Update: {
          creed_id?: string
          mode?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_token_creeds_creed_id_fkey"
            columns: ["creed_id"]
            isOneToOne: false
            referencedRelation: "creeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_token_creeds_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "oauth_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_expires_at: string
          access_token_hash: string
          authorization_code_hash: string | null
          client_id: string
          created_at: string
          encrypted_access_token: string
          encrypted_refresh_token: string
          id: string
          last_used_at: string | null
          parent_token_id: string | null
          ready_at: string | null
          refresh_expires_at: string
          refresh_token_hash: string
          resource: string | null
          revoked_at: string | null
          scope: string
          user_id: string
        }
        Insert: {
          access_expires_at: string
          access_token_hash: string
          authorization_code_hash?: string | null
          client_id: string
          created_at?: string
          encrypted_access_token: string
          encrypted_refresh_token: string
          id?: string
          last_used_at?: string | null
          parent_token_id?: string | null
          ready_at?: string | null
          refresh_expires_at: string
          refresh_token_hash: string
          resource?: string | null
          revoked_at?: string | null
          scope?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string
          access_token_hash?: string
          authorization_code_hash?: string | null
          client_id?: string
          created_at?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string
          id?: string
          last_used_at?: string | null
          parent_token_id?: string | null
          ready_at?: string | null
          refresh_expires_at?: string
          refresh_token_hash?: string
          resource?: string | null
          revoked_at?: string | null
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_parent_token_id_fkey"
            columns: ["parent_token_id"]
            isOneToOne: false
            referencedRelation: "oauth_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_hits: {
        Row: {
          hit_count: number
          key: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          hit_count: number
          key: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          hit_count?: number
          key?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_creed_onboarding_action: {
        Args: {
          p_action: string
          p_activity_id?: string
          p_actor_user_id: string
          p_creed_id: string
          p_name?: string
          p_sections?: Json
        }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_cost?: number
          p_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      commit_creed_section_batch: {
        Args: {
          p_activity: Json
          p_actor: Json
          p_creed_id: string
          p_expected: Json
          p_order: string[]
          p_proposal_id: string
          p_remove: string[]
          p_sections: Json
        }
        Returns: undefined
      }
      commit_personal_creed: {
        Args: {
          p_activity: Json
          p_creed_id: string
          p_expected: Json
          p_expected_settings?: Json
          p_proposals: Json
          p_remove_proposals: string[]
          p_remove_sections: string[]
          p_require_approval: boolean
          p_review?: Json
          p_sections: Json
          p_user_id: string
          p_version_control: Json
        }
        Returns: Json
      }
      create_owned_creed: {
        Args: { p_name: string; p_type: string; p_user_id: string }
        Returns: {
          id: string
          name: string
          onboarding_stage: string
          type: string
        }[]
      }
      creed_schema_version: { Args: never; Returns: string }
      creed_section_baseline: { Args: { p_creed_id: string }; Returns: Json }
      get_creed_state_tick: { Args: { p_creed_id: string }; Returns: number }
      increment_mcp_read: {
        Args: { p_client_id: string; p_day: string; p_user_id: string }
        Returns: undefined
      }
      increment_mcp_read_for_creed: {
        Args: {
          p_client_id: string
          p_creed_id: string
          p_day: string
          p_reader_user_id: string
        }
        Returns: undefined
      }
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

