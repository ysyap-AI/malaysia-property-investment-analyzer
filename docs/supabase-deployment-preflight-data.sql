-- Aggregate-only live preflight. No row contents, secrets, fixtures, or writes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT jsonb_build_object(
 'checked_at', now(), 'read_only',current_setting('transaction_read_only'),
 'migration_history', (SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,'statement_count',cardinality(statements),'statements_md5',md5(array_to_string(statements,E'\n')),'statement_md5s',(SELECT jsonb_agg(md5(s)) FROM unnest(statements) s)) ORDER BY version) FROM supabase_migrations.schema_migrations),
 'checks', (SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT 'row_count' AS category, 'acquisition_costs' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'operating_expenses' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'profiles' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."profiles" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'investment_criteria' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."investment_criteria" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'financing' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'properties' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE true
UNION ALL
SELECT 'row_count' AS category, 'scenario_configs' AS table_name, 'all_rows' AS check_name, count(*)::bigint AS count FROM public."scenario_configs" WHERE true
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'legal_fees' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "legal_fees" IS NOT NULL AND NOT ("legal_fees" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'stamp_duty' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "stamp_duty" IS NOT NULL AND NOT ("stamp_duty" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'valuation_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "valuation_fee" IS NOT NULL AND NOT ("valuation_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'agent_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "agent_fee" IS NOT NULL AND NOT ("agent_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'renovation_cost' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "renovation_cost" IS NOT NULL AND NOT ("renovation_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'furnishing_cost' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "furnishing_cost" IS NOT NULL AND NOT ("furnishing_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'other_costs' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "other_costs" IS NOT NULL AND NOT ("other_costs" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'purchase_price' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "purchase_price" IS NOT NULL AND NOT ("purchase_price" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'spa_legal_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "spa_legal_fee" IS NOT NULL AND NOT ("spa_legal_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'transfer_stamp_duty' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "transfer_stamp_duty" IS NOT NULL AND NOT ("transfer_stamp_duty" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'loan_legal_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "loan_legal_fee" IS NOT NULL AND NOT ("loan_legal_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'loan_stamp_duty' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "loan_stamp_duty" IS NOT NULL AND NOT ("loan_stamp_duty" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'utility_deposits' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "utility_deposits" IS NOT NULL AND NOT ("utility_deposits" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'maintenance_deposit' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "maintenance_deposit" IS NOT NULL AND NOT ("maintenance_deposit" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'acquisition_agent_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "acquisition_agent_fee" IS NOT NULL AND NOT ("acquisition_agent_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'initial_holding_cost' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "initial_holding_cost" IS NOT NULL AND NOT ("initial_holding_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'contingency_cost' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "contingency_cost" IS NOT NULL AND NOT ("contingency_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'acquisition_costs' AS table_name, 'other_cost' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "other_cost" IS NOT NULL AND NOT ("other_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'purchase_price' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "purchase_price" IS NOT NULL AND NOT ("purchase_price" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'deposit_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "deposit_percent" IS NOT NULL AND NOT ("deposit_percent" BETWEEN 0 AND 100)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'deposit_amount' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "deposit_amount" IS NOT NULL AND NOT ("deposit_amount" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'loan_amount' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "loan_amount" IS NOT NULL AND NOT ("loan_amount" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'interest_rate_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "interest_rate_percent" IS NOT NULL AND NOT ("interest_rate_percent" BETWEEN 0 AND 30)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'loan_tenure_years' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "loan_tenure_years" IS NOT NULL AND NOT ("loan_tenure_years" BETWEEN 1 AND 50)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'loan_to_value_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "loan_to_value_percent" IS NOT NULL AND NOT ("loan_to_value_percent" BETWEEN 0 AND 100)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'down_payment' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "down_payment" IS NOT NULL AND NOT ("down_payment" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'annual_interest_rate_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "annual_interest_rate_percent" IS NOT NULL AND NOT ("annual_interest_rate_percent" BETWEEN 0 AND 30)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'calculated_monthly_instalment' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "calculated_monthly_instalment" IS NOT NULL AND NOT ("calculated_monthly_instalment" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'financing' AS table_name, 'user_provided_monthly_instalment' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "user_provided_monthly_instalment" IS NOT NULL AND NOT ("user_provided_monthly_instalment" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'management_fee_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "management_fee_monthly" IS NOT NULL AND NOT ("management_fee_monthly" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'maintenance_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "maintenance_monthly" IS NOT NULL AND NOT ("maintenance_monthly" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'sinking_fund_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "sinking_fund_monthly" IS NOT NULL AND NOT ("sinking_fund_monthly" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'quit_rent_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "quit_rent_annual" IS NOT NULL AND NOT ("quit_rent_annual" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'assessment_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "assessment_annual" IS NOT NULL AND NOT ("assessment_annual" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'insurance_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "insurance_annual" IS NOT NULL AND NOT ("insurance_annual" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'utilities_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "utilities_monthly" IS NOT NULL AND NOT ("utilities_monthly" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'other_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "other_monthly" IS NOT NULL AND NOT ("other_monthly" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_maintenance_fee' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_maintenance_fee" IS NOT NULL AND NOT ("annual_maintenance_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_sinking_fund' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_sinking_fund" IS NOT NULL AND NOT ("annual_sinking_fund" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_assessment_tax' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_assessment_tax" IS NOT NULL AND NOT ("annual_assessment_tax" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_quit_or_parcel_rent' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_quit_or_parcel_rent" IS NOT NULL AND NOT ("annual_quit_or_parcel_rent" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_landlord_insurance' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_landlord_insurance" IS NOT NULL AND NOT ("annual_landlord_insurance" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_property_management_fee' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_property_management_fee" IS NOT NULL AND NOT ("annual_property_management_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_leasing_agent_fee' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_leasing_agent_fee" IS NOT NULL AND NOT ("annual_leasing_agent_fee" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_tenancy_documentation' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_tenancy_documentation" IS NOT NULL AND NOT ("annual_tenancy_documentation" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_repair_reserve' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_repair_reserve" IS NOT NULL AND NOT ("annual_repair_reserve" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_furniture_replacement_reserve' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_furniture_replacement_reserve" IS NOT NULL AND NOT ("annual_furniture_replacement_reserve" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_cleaning_cost' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_cleaning_cost" IS NOT NULL AND NOT ("annual_cleaning_cost" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_vacancy_utilities' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_vacancy_utilities" IS NOT NULL AND NOT ("annual_vacancy_utilities" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_bad_debt_allowance' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_bad_debt_allowance" IS NOT NULL AND NOT ("annual_bad_debt_allowance" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'operating_expenses' AS table_name, 'annual_other_operating_expenses' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "annual_other_operating_expenses" IS NOT NULL AND NOT ("annual_other_operating_expenses" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'built_up_sqft' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "built_up_sqft" IS NOT NULL AND NOT ("built_up_sqft" BETWEEN 1 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'bedrooms' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "bedrooms" IS NOT NULL AND NOT ("bedrooms" BETWEEN 0 AND 50)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'bathrooms' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "bathrooms" IS NOT NULL AND NOT ("bathrooms" BETWEEN 0 AND 50)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'asking_price' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "asking_price" IS NOT NULL AND NOT ("asking_price" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'lease_expiry_year' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "lease_expiry_year" IS NOT NULL AND NOT ("lease_expiry_year" BETWEEN 1900 AND 3000)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'completion_year' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "completion_year" IS NOT NULL AND NOT ("completion_year" BETWEEN 1900 AND 2100)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'car_parks' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "car_parks" IS NOT NULL AND NOT ("car_parks" BETWEEN 0 AND 50)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'total_floors' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "total_floors" IS NOT NULL AND NOT ("total_floors" BETWEEN 1 AND 200)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'target_purchase_price' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "target_purchase_price" IS NOT NULL AND NOT ("target_purchase_price" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'bank_valuation' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "bank_valuation" IS NOT NULL AND NOT ("bank_valuation" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'range_violation' AS category, 'properties' AS table_name, 'expected_monthly_rent' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "expected_monthly_rent" IS NOT NULL AND NOT ("expected_monthly_rent" BETWEEN 0 AND 90071992547409.91)
UNION ALL
SELECT 'enum_violation' AS category, 'properties' AS table_name, 'tenure' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "tenure" IS NOT NULL AND "tenure" NOT IN ('freehold','leasehold')
UNION ALL
SELECT 'enum_violation' AS category, 'properties' AS table_name, 'rent_verification_status' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "rent_verification_status" IS NOT NULL AND "rent_verification_status" NOT IN ('verified','user-entered','estimated','listing-data','missing')
UNION ALL
SELECT 'enum_violation' AS category, 'properties' AS table_name, 'property_status' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "property_status" IS NOT NULL AND "property_status" NOT IN ('prospect','analysing','watchlist','shortlisted','purchased','rejected')
UNION ALL
SELECT 'enum_violation' AS category, 'properties' AS table_name, 'analysis_status' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE "analysis_status" IS NOT NULL AND "analysis_status" NOT IN ('not_started','in_progress','completed','archived')
UNION ALL
SELECT 'legacy_populated' AS category, 'acquisition_costs' AS table_name, 'legal_fees' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "legal_fees" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'acquisition_costs' AS table_name, 'stamp_duty' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "stamp_duty" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'acquisition_costs' AS table_name, 'agent_fee' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "agent_fee" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'acquisition_costs' AS table_name, 'other_costs' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE "other_costs" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'management_fee_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "management_fee_monthly" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'maintenance_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "maintenance_monthly" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'sinking_fund_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "sinking_fund_monthly" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'quit_rent_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "quit_rent_annual" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'assessment_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "assessment_annual" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'insurance_annual' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "insurance_annual" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'utilities_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "utilities_monthly" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'operating_expenses' AS table_name, 'other_monthly' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE "other_monthly" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'financing' AS table_name, 'purchase_price' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "purchase_price" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'financing' AS table_name, 'deposit_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "deposit_percent" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'financing' AS table_name, 'deposit_amount' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "deposit_amount" IS NOT NULL
UNION ALL
SELECT 'legacy_populated' AS category, 'financing' AS table_name, 'interest_rate_percent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE "interest_rate_percent" IS NOT NULL
UNION ALL
SELECT 'integrity' AS category, 'acquisition_costs' AS table_name, 'null_parent' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE property_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'acquisition_costs' AS table_name, 'orphan_parent' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id=property_id)
UNION ALL
SELECT 'integrity' AS category, 'acquisition_costs' AS table_name, 'duplicate_parent_rows' AS check_name, count(*)::bigint AS count FROM public."acquisition_costs" WHERE property_id IN (SELECT property_id FROM public."acquisition_costs" GROUP BY property_id HAVING count(*)>1)
UNION ALL
SELECT 'integrity' AS category, 'operating_expenses' AS table_name, 'null_parent' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE property_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'operating_expenses' AS table_name, 'orphan_parent' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id=property_id)
UNION ALL
SELECT 'integrity' AS category, 'operating_expenses' AS table_name, 'duplicate_parent_rows' AS check_name, count(*)::bigint AS count FROM public."operating_expenses" WHERE property_id IN (SELECT property_id FROM public."operating_expenses" GROUP BY property_id HAVING count(*)>1)
UNION ALL
SELECT 'integrity' AS category, 'financing' AS table_name, 'null_parent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE property_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'financing' AS table_name, 'orphan_parent' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id=property_id)
UNION ALL
SELECT 'integrity' AS category, 'financing' AS table_name, 'duplicate_parent_rows' AS check_name, count(*)::bigint AS count FROM public."financing" WHERE property_id IN (SELECT property_id FROM public."financing" GROUP BY property_id HAVING count(*)>1)
UNION ALL
SELECT 'integrity' AS category, 'profiles' AS table_name, 'null_owner' AS check_name, count(*)::bigint AS count FROM public."profiles" WHERE id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'profiles' AS table_name, 'orphan_owner' AS check_name, count(*)::bigint AS count FROM public."profiles" WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=public."profiles"."id")
UNION ALL
SELECT 'integrity' AS category, 'properties' AS table_name, 'null_owner' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE user_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'properties' AS table_name, 'orphan_owner' AS check_name, count(*)::bigint AS count FROM public."properties" WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=public."properties"."user_id")
UNION ALL
SELECT 'integrity' AS category, 'investment_criteria' AS table_name, 'null_owner' AS check_name, count(*)::bigint AS count FROM public."investment_criteria" WHERE user_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'investment_criteria' AS table_name, 'orphan_owner' AS check_name, count(*)::bigint AS count FROM public."investment_criteria" WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=public."investment_criteria"."user_id")
UNION ALL
SELECT 'integrity' AS category, 'scenario_configs' AS table_name, 'null_owner' AS check_name, count(*)::bigint AS count FROM public."scenario_configs" WHERE user_id IS NULL
UNION ALL
SELECT 'integrity' AS category, 'scenario_configs' AS table_name, 'orphan_owner' AS check_name, count(*)::bigint AS count FROM public."scenario_configs" WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=public."scenario_configs"."user_id")
UNION ALL
SELECT 'integrity' AS category, 'investment_criteria' AS table_name, 'duplicate_owner_rows' AS check_name, count(*)::bigint AS count FROM public."investment_criteria" WHERE user_id IN (SELECT user_id FROM public.investment_criteria GROUP BY user_id HAVING count(*)>1)
UNION ALL
SELECT 'integrity' AS category, 'scenario_configs' AS table_name, 'duplicate_scenario_rows' AS check_name, count(*)::bigint AS count FROM public."scenario_configs" WHERE (user_id,scenario_name) IN (SELECT user_id,scenario_name FROM public.scenario_configs GROUP BY user_id,scenario_name HAVING count(*)>1)) c),
 'effective_privileges', (SELECT jsonb_agg(jsonb_build_object('table',t.tablename,'role',r.rolname,'privilege',p.privilege,'allowed',has_table_privilege(r.rolname,format('public.%I',t.tablename),p.privilege))) FROM pg_tables t CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(rolname) CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) WHERE t.schemaname='public'),
 'function_execute', (SELECT jsonb_agg(jsonb_build_object('function',p.proname,'role',r.rolname,'allowed',has_function_privilege(r.rolname,p.oid,'EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN (VALUES ('anon'),('authenticated')) r(rolname) WHERE n.nspname='public'),
 'indexes', (SELECT jsonb_agg(jsonb_build_object('table',t.relname,'name',i.relname,'valid',x.indisvalid,'ready',x.indisready,'definition',pg_get_indexdef(i.oid))) FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public')
) AS preflight;
COMMIT;
