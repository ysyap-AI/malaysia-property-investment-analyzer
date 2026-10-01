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
          acquisition_agent_fee: number | null
          agent_fee: number | null
          contingency_cost: number | null
          created_at: string
          furnishing_cost: number | null
          id: string
          initial_holding_cost: number | null
          legal_fees: number | null
          loan_legal_fee: number | null
          loan_stamp_duty: number | null
          maintenance_deposit: number | null
          other_cost: number | null
          other_costs: number | null
          property_id: string
          purchase_price: number | null
          renovation_cost: number | null
          spa_legal_fee: number | null
          stamp_duty: number | null
          transfer_stamp_duty: number | null
          updated_at: string
          utility_deposits: number | null
          valuation_fee: number | null
        }
        Insert: {
          acquisition_agent_fee?: number | null
          agent_fee?: number | null
          contingency_cost?: number | null
          created_at?: string
          furnishing_cost?: number | null
          id?: string
          initial_holding_cost?: number | null
          legal_fees?: number | null
          loan_legal_fee?: number | null
          loan_stamp_duty?: number | null
          maintenance_deposit?: number | null
          other_cost?: number | null
          other_costs?: number | null
          property_id: string
          purchase_price?: number | null
          renovation_cost?: number | null
          spa_legal_fee?: number | null
          stamp_duty?: number | null
          transfer_stamp_duty?: number | null
          updated_at?: string
          utility_deposits?: number | null
          valuation_fee?: number | null
        }
        Update: {
          acquisition_agent_fee?: number | null
          agent_fee?: number | null
          contingency_cost?: number | null
          created_at?: string
          furnishing_cost?: number | null
          id?: string
          initial_holding_cost?: number | null
          legal_fees?: number | null
          loan_legal_fee?: number | null
          loan_stamp_duty?: number | null
          maintenance_deposit?: number | null
          other_cost?: number | null
          other_costs?: number | null
          property_id?: string
          purchase_price?: number | null
          renovation_cost?: number | null
          spa_legal_fee?: number | null
          stamp_duty?: number | null
          transfer_stamp_duty?: number | null
          updated_at?: string
          utility_deposits?: number | null
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
          annual_interest_rate_percent: number | null
          bank_quote_verified: boolean
          calculated_monthly_instalment: number | null
          created_at: string
          deposit_amount: number | null
          deposit_percent: number | null
          down_payment: number | null
          financing_notes: string | null
          id: string
          interest_rate_percent: number | null
          loan_amount: number | null
          loan_tenure_years: number | null
          loan_to_value_percent: number | null
          loan_type: string | null
          property_id: string
          purchase_price: number | null
          updated_at: string
          use_user_provided_instalment: boolean
          user_provided_monthly_instalment: number | null
        }
        Insert: {
          annual_interest_rate_percent?: number | null
          bank_quote_verified?: boolean
          calculated_monthly_instalment?: number | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number | null
          down_payment?: number | null
          financing_notes?: string | null
          id?: string
          interest_rate_percent?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_to_value_percent?: number | null
          loan_type?: string | null
          property_id: string
          purchase_price?: number | null
          updated_at?: string
          use_user_provided_instalment?: boolean
          user_provided_monthly_instalment?: number | null
        }
        Update: {
          annual_interest_rate_percent?: number | null
          bank_quote_verified?: boolean
          calculated_monthly_instalment?: number | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number | null
          down_payment?: number | null
          financing_notes?: string | null
          id?: string
          interest_rate_percent?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_to_value_percent?: number | null
          loan_type?: string | null
          property_id?: string
          purchase_price?: number | null
          updated_at?: string
          use_user_provided_instalment?: boolean
          user_provided_monthly_instalment?: number | null
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
          annual_assessment_tax: number | null
          annual_bad_debt_allowance: number | null
          annual_cleaning_cost: number | null
          annual_furniture_replacement_reserve: number | null
          annual_landlord_insurance: number | null
          annual_leasing_agent_fee: number | null
          annual_maintenance_fee: number | null
          annual_other_operating_expenses: number | null
          annual_property_management_fee: number | null
          annual_quit_or_parcel_rent: number | null
          annual_repair_reserve: number | null
          annual_sinking_fund: number | null
          annual_tenancy_documentation: number | null
          annual_vacancy_utilities: number | null
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
          annual_assessment_tax?: number | null
          annual_bad_debt_allowance?: number | null
          annual_cleaning_cost?: number | null
          annual_furniture_replacement_reserve?: number | null
          annual_landlord_insurance?: number | null
          annual_leasing_agent_fee?: number | null
          annual_maintenance_fee?: number | null
          annual_other_operating_expenses?: number | null
          annual_property_management_fee?: number | null
          annual_quit_or_parcel_rent?: number | null
          annual_repair_reserve?: number | null
          annual_sinking_fund?: number | null
          annual_tenancy_documentation?: number | null
          annual_vacancy_utilities?: number | null
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
          annual_assessment_tax?: number | null
          annual_bad_debt_allowance?: number | null
          annual_cleaning_cost?: number | null
          annual_furniture_replacement_reserve?: number | null
          annual_landlord_insurance?: number | null
          annual_leasing_agent_fee?: number | null
          annual_maintenance_fee?: number | null
          annual_other_operating_expenses?: number | null
          annual_property_management_fee?: number | null
          annual_quit_or_parcel_rent?: number | null
          annual_repair_reserve?: number | null
          annual_sinking_fund?: number | null
          annual_tenancy_documentation?: number | null
          annual_vacancy_utilities?: number | null
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
          analysis_status: string | null
          asking_price: number | null
          bank_valuation: number | null
          bathrooms: number | null
          bedrooms: number | null
          built_up_sqft: number | null
          car_parks: number | null
          city: string | null
          completion_year: number | null
          country: string | null
          created_at: string
          developer: string | null
          district: string | null
          expected_monthly_rent: number | null
          floor_level: string | null
          full_address: string | null
          furnishing_status: string | null
          id: string
          lease_expiry_year: number | null
          listing_url: string | null
          notes: string | null
          postcode: string | null
          project_name: string
          property_status: string | null
          property_type: string | null
          rent_verification_status: string | null
          state: string | null
          target_purchase_price: number | null
          tenure: string | null
          title_type: string | null
          total_floors: number | null
          unit_condition: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_status?: string | null
          asking_price?: number | null
          bank_valuation?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          built_up_sqft?: number | null
          car_parks?: number | null
          city?: string | null
          completion_year?: number | null
          country?: string | null
          created_at?: string
          developer?: string | null
          district?: string | null
          expected_monthly_rent?: number | null
          floor_level?: string | null
          full_address?: string | null
          furnishing_status?: string | null
          id?: string
          lease_expiry_year?: number | null
          listing_url?: string | null
          notes?: string | null
          postcode?: string | null
          project_name: string
          property_status?: string | null
          property_type?: string | null
          rent_verification_status?: string | null
          state?: string | null
          target_purchase_price?: number | null
          tenure?: string | null
          title_type?: string | null
          total_floors?: number | null
          unit_condition?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_status?: string | null
          asking_price?: number | null
          bank_valuation?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          built_up_sqft?: number | null
          car_parks?: number | null
          city?: string | null
          completion_year?: number | null
          country?: string | null
          created_at?: string
          developer?: string | null
          district?: string | null
          expected_monthly_rent?: number | null
          floor_level?: string | null
          full_address?: string | null
          furnishing_status?: string | null
          id?: string
          lease_expiry_year?: number | null
          listing_url?: string | null
          notes?: string | null
          postcode?: string | null
          project_name?: string
          property_status?: string | null
          property_type?: string | null
          rent_verification_status?: string | null
          state?: string | null
          target_purchase_price?: number | null
          tenure?: string | null
          title_type?: string | null
          total_floors?: number | null
          unit_condition?: string | null
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
