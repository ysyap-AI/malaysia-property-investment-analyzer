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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acquisition_costs: {
        Row: {
          agent_fee: number | null
          created_at: string
          furnishing_cost: number | null
          id: string
          legal_fees: number | null
          other_costs: number | null
          property_id: string
          renovation_cost: number | null
          stamp_duty: number | null
          updated_at: string
          valuation_fee: number | null
        }
        Insert: {
          agent_fee?: number | null
          created_at?: string
          furnishing_cost?: number | null
          id?: string
          legal_fees?: number | null
          other_costs?: number | null
          property_id: string
          renovation_cost?: number | null
          stamp_duty?: number | null
          updated_at?: string
          valuation_fee?: number | null
        }
        Update: {
          agent_fee?: number | null
          created_at?: string
          furnishing_cost?: number | null
          id?: string
          legal_fees?: number | null
          other_costs?: number | null
          property_id?: string
          renovation_cost?: number | null
          stamp_duty?: number | null
          updated_at?: string
          valuation_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      financing: {
        Row: {
          created_at: string
          deposit_amount: number | null
          deposit_percent: number | null
          id: string
          interest_rate_percent: number | null
          loan_amount: number | null
          loan_tenure_years: number | null
          loan_type: string | null
          property_id: string
          purchase_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number | null
          id?: string
          interest_rate_percent?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type?: string | null
          property_id: string
          purchase_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number | null
          id?: string
          interest_rate_percent?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type?: string | null
          property_id?: string
          purchase_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_criteria: {
        Row: {
          config_version: string | null
          created_at: string
          id: string
          max_break_even_occupancy_percent: number | null
          min_cash_on_cash_percent: number | null
          min_gross_yield_percent: number | null
          min_net_yield_percent: number | null
          updated_at: string
          user_id: string
          weight_cash_flow: number | null
          weight_data_confidence: number | null
          weight_risk: number | null
          weight_yield: number | null
        }
        Insert: {
          config_version?: string | null
          created_at?: string
          id?: string
          max_break_even_occupancy_percent?: number | null
          min_cash_on_cash_percent?: number | null
          min_gross_yield_percent?: number | null
          min_net_yield_percent?: number | null
          updated_at?: string
          user_id: string
          weight_cash_flow?: number | null
          weight_data_confidence?: number | null
          weight_risk?: number | null
          weight_yield?: number | null
        }
        Update: {
          config_version?: string | null
          created_at?: string
          id?: string
          max_break_even_occupancy_percent?: number | null
          min_cash_on_cash_percent?: number | null
          min_gross_yield_percent?: number | null
          min_net_yield_percent?: number | null
          updated_at?: string
          user_id?: string
          weight_cash_flow?: number | null
          weight_data_confidence?: number | null
          weight_risk?: number | null
          weight_yield?: number | null
        }
        Relationships: []
      }
      operating_expenses: {
        Row: {
          assessment_annual: number | null
          created_at: string
          id: string
          insurance_annual: number | null
          maintenance_monthly: number | null
          management_fee_monthly: number | null
          other_monthly: number | null
          property_id: string
          quit_rent_annual: number | null
          sinking_fund_monthly: number | null
          updated_at: string
          utilities_monthly: number | null
        }
        Insert: {
          assessment_annual?: number | null
          created_at?: string
          id?: string
          insurance_annual?: number | null
          maintenance_monthly?: number | null
          management_fee_monthly?: number | null
          other_monthly?: number | null
          property_id: string
          quit_rent_annual?: number | null
          sinking_fund_monthly?: number | null
          updated_at?: string
          utilities_monthly?: number | null
        }
        Update: {
          assessment_annual?: number | null
          created_at?: string
          id?: string
          insurance_annual?: number | null
          maintenance_monthly?: number | null
          management_fee_monthly?: number | null
          other_monthly?: number | null
          property_id?: string
          quit_rent_annual?: number | null
          sinking_fund_monthly?: number | null
          updated_at?: string
          utilities_monthly?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          asking_price: number | null
          bathrooms: number | null
          bedrooms: number | null
          built_up_sqft: number | null
          created_at: string
          id: string
          listing_url: string | null
          name: string
          notes: string | null
          property_type: string | null
          state: string | null
          tenure: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          asking_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          built_up_sqft?: number | null
          created_at?: string
          id?: string
          listing_url?: string | null
          name: string
          notes?: string | null
          property_type?: string | null
          state?: string | null
          tenure?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          asking_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          built_up_sqft?: number | null
          created_at?: string
          id?: string
          listing_url?: string | null
          name?: string
          notes?: string | null
          property_type?: string | null
          state?: string | null
          tenure?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenario_configs: {
        Row: {
          config_version: string | null
          created_at: string
          expense_adjustment_percent: number | null
          id: string
          interest_rate_adjustment_percent: number | null
          rent_adjustment_percent: number | null
          scenario_name: string
          updated_at: string
          user_id: string
          vacancy_rate_percent: number | null
        }
        Insert: {
          config_version?: string | null
          created_at?: string
          expense_adjustment_percent?: number | null
          id?: string
          interest_rate_adjustment_percent?: number | null
          rent_adjustment_percent?: number | null
          scenario_name: string
          updated_at?: string
          user_id: string
          vacancy_rate_percent?: number | null
        }
        Update: {
          config_version?: string | null
          created_at?: string
          expense_adjustment_percent?: number | null
          id?: string
          interest_rate_adjustment_percent?: number | null
          rent_adjustment_percent?: number | null
          scenario_name?: string
          updated_at?: string
          user_id?: string
          vacancy_rate_percent?: number | null
        }
        Relationships: []
      }

      location_fact_definitions: {
        Row: {
          aggregation_scope: string
          allowed_category_values: string[] | null
          category: string
          contract_reference: string
          coverage_requirement: string
          created_at: string
          definition_version: number
          deprecated_at: string | null
          display_name: string
          duration_required: boolean
          entity_taxonomy_key: string
          fact_key: string
          id: string
          measurement_method: string
          radius_required: boolean
          semantic_definition: string
          taxonomy_version: number
          unit: string
          value_type: string
          zero_semantics: string
        }
        ComputedFields: never
        Insert: {
          aggregation_scope: string
          allowed_category_values?: string[] | null
          category: string
          contract_reference: string
          coverage_requirement: string
          created_at?: string
          definition_version: number
          deprecated_at?: string | null
          display_name: string
          duration_required: boolean
          entity_taxonomy_key: string
          fact_key: string
          id?: string
          measurement_method: string
          radius_required: boolean
          semantic_definition: string
          taxonomy_version: number
          unit: string
          value_type: string
          zero_semantics: string
        }
        Update: {
          aggregation_scope?: string
          allowed_category_values?: string[] | null
          category?: string
          contract_reference?: string
          coverage_requirement?: string
          created_at?: string
          definition_version?: number
          deprecated_at?: string | null
          display_name?: string
          duration_required?: boolean
          entity_taxonomy_key?: string
          fact_key?: string
          id?: string
          measurement_method?: string
          radius_required?: boolean
          semantic_definition?: string
          taxonomy_version?: number
          unit?: string
          value_type?: string
          zero_semantics?: string
        }
        Relationships: []
      }
      location_freshness_policies: {
        Row: {
          age_basis: string
          approval_reference: string
          category: string
          created_at: string
          deprecated_at: string | null
          description: string
          expire_after_seconds: number
          fresh_for_seconds: number
          id: string
          policy_key: string
          policy_version: number
        }
        ComputedFields: never
        Insert: {
          age_basis: string
          approval_reference: string
          category: string
          created_at?: string
          deprecated_at?: string | null
          description: string
          expire_after_seconds: number
          fresh_for_seconds: number
          id?: string
          policy_key: string
          policy_version: number
        }
        Update: {
          age_basis?: string
          approval_reference?: string
          category?: string
          created_at?: string
          deprecated_at?: string | null
          description?: string
          expire_after_seconds?: number
          fresh_for_seconds?: number
          id?: string
          policy_key?: string
          policy_version?: number
        }
        Relationships: []
      }
      location_provider_registry: {
        Row: {
          approval_state: string
          attribution_required: boolean
          attribution_text: string | null
          capabilities: string[]
          created_at: string
          deprecated_at: string | null
          display_name: string
          id: string
          provider_key: string
          provider_version: number
          retention_class: string
          retention_limit_seconds: number | null
          review_reference: string | null
          reviewed_at: string | null
          terms_reference: string | null
        }
        ComputedFields: never
        Insert: {
          approval_state?: string
          attribution_required?: boolean
          attribution_text?: string | null
          capabilities: string[]
          created_at?: string
          deprecated_at?: string | null
          display_name: string
          id?: string
          provider_key: string
          provider_version: number
          retention_class?: string
          retention_limit_seconds?: number | null
          review_reference?: string | null
          reviewed_at?: string | null
          terms_reference?: string | null
        }
        Update: {
          approval_state?: string
          attribution_required?: boolean
          attribution_text?: string | null
          capabilities?: string[]
          created_at?: string
          deprecated_at?: string | null
          display_name?: string
          id?: string
          provider_key?: string
          provider_version?: number
          retention_class?: string
          retention_limit_seconds?: number | null
          review_reference?: string | null
          reviewed_at?: string | null
          terms_reference?: string | null
        }
        Relationships: []
      }
      property_location_intelligence_state: {
        Row: {
          created_at: string
          current_location_version_id: string | null
          freshness_status: string
          processing_status: string
          property_id: string
          publication_status: string
          state_revision: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          current_location_version_id?: string | null
          freshness_status?: string
          processing_status?: string
          property_id: string
          publication_status?: string
          state_revision?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_location_version_id?: string | null
          freshness_status?: string
          processing_status?: string
          property_id?: string
          publication_status?: string
          state_revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_location_intelligence_state_current_location_fkey"
            columns: ["property_id", "current_location_version_id"]
            isOneToOne: true
            referencedRelation: "property_location_versions"
            referencedColumns: ["property_id", "id"]
          },
          {
            foreignKeyName: "property_location_intelligence_state_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_location_versions: {
        Row: {
          accuracy_m: number | null
          change_reason: string
          confidence_mapping_version: string | null
          confirmation_status: string
          confirmed_at: string | null
          confirmed_by: string | null
          coordinate_precision: string
          coordinate_source: string
          created_at: string
          created_by: string
          geocode_confidence: string
          id: string
          input_address: string | null
          latitude: number | null
          longitude: number | null
          normalization_version: string | null
          normalized_address: string | null
          operation_hash: string
          operation_id: string
          position: unknown
          property_id: string
          property_input_hash: string
          provider_candidate_id: string | null
          provider_version_id: string | null
          retrieved_at: string | null
          source_crs: string | null
          version_number: number
        }
        ComputedFields: never
        Insert: {
          accuracy_m?: number | null
          change_reason: string
          confidence_mapping_version?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          coordinate_precision?: string
          coordinate_source?: string
          created_at?: string
          created_by: string
          geocode_confidence?: string
          id?: string
          input_address?: string | null
          latitude?: number | null
          longitude?: number | null
          normalization_version?: string | null
          normalized_address?: string | null
          operation_hash: string
          operation_id: string
          position?: never
          property_id: string
          property_input_hash: string
          provider_candidate_id?: string | null
          provider_version_id?: string | null
          retrieved_at?: string | null
          source_crs?: string | null
          version_number: number
        }
        Update: {
          accuracy_m?: number | null
          change_reason?: string
          confidence_mapping_version?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          coordinate_precision?: string
          coordinate_source?: string
          created_at?: string
          created_by?: string
          geocode_confidence?: string
          id?: string
          input_address?: string | null
          latitude?: number | null
          longitude?: number | null
          normalization_version?: string | null
          normalized_address?: string | null
          operation_hash?: string
          operation_id?: string
          position?: never
          property_id?: string
          property_input_hash?: string
          provider_candidate_id?: string | null
          provider_version_id?: string | null
          retrieved_at?: string | null
          source_crs?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_location_versions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_location_versions_provider_version_id_fkey"
            columns: ["provider_version_id"]
            isOneToOne: false
            referencedRelation: "location_provider_registry"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_property: { Args: { _property_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
