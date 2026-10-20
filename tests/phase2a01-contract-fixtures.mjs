// Independent executable interpretation of specification 1.1 sections 8.1/8.2.
// Synthetic test contracts only; never imported by the migration/application.
export function factFixtures() {
  const facts = [];
  const subjects = {
    transport: ["rail_station", "bus_stop"],
    daily_convenience: ["supermarket", "pharmacy", "convenience_store", "bank_atm"],
    education: ["school", "university_college", "international_school"],
    healthcare: ["hospital_medical_centre", "clinic"],
    retail: ["significant_retail_centre"],
    road: ["major_road_access", "expressway_interchange"],
    employment: ["significant_economic_node"],
  };
  function add(domain, entity, suffix, fields) {
    facts.push({
      fact_key: `${domain}.${entity}.${suffix}`,
      definition_version: 1,
      display_name: "Synthetic contract",
      semantic_definition:
        "Transaction-local validation fixture, not an approved semantic release.",
      category: domain.toUpperCase(),
      entity_taxonomy_key: entity,
      taxonomy_version: 1,
      radius_required: false,
      duration_required: false,
      allowed_category_values: null,
      contract_reference: "synthetic:spec-1.1",
      ...fields,
    });
  }
  for (const [domain, entities] of Object.entries(subjects))
    for (const entity of entities) {
      if (!["road", "employment"].includes(domain)) {
        add(domain, entity, "nearest_straight_line_m", {
          value_type: "DECIMAL",
          unit: "m",
          measurement_method: "STRAIGHT_LINE",
          aggregation_scope: "NEAREST_ELIGIBLE",
          coverage_requirement: "COMPLETE_RADIUS",
          zero_semantics: "MEASURED_ZERO",
        });
        add(domain, entity, "count_within_radius", {
          value_type: "INTEGER",
          unit: "count",
          measurement_method: "STRAIGHT_LINE",
          aggregation_scope: "WITHIN_RADIUS",
          coverage_requirement: "COMPLETE_RADIUS",
          zero_semantics: "PROVEN_EMPTY_SCOPE",
          radius_required: true,
        });
      }
      const modes =
        domain === "healthcare"
          ? ["walking", "driving"]
          : ["retail", "road", "employment"].includes(domain)
            ? ["driving"]
            : ["walking"];
      for (const mode of modes)
        for (const unit of ["m", "s"])
          add(domain, entity, `nearest_${mode}_route_${unit}`, {
            value_type: "DECIMAL",
            unit,
            measurement_method: `${mode.toUpperCase()}_ROUTE`,
            aggregation_scope: "NEAREST_ELIGIBLE",
            coverage_requirement: "COMPLETE_CANDIDATE_SET",
            zero_semantics: "MEASURED_ZERO",
          });
      if (domain === "employment")
        add(domain, entity, "count_within_driving_duration", {
          value_type: "INTEGER",
          unit: "count",
          measurement_method: "DRIVING_ROUTE",
          aggregation_scope: "WITHIN_DURATION",
          coverage_requirement: "COMPLETE_CANDIDATE_SET",
          zero_semantics: "PROVEN_EMPTY_SCOPE",
          duration_required: true,
        });
    }
  add("daily_convenience", "essential_categories", "coverage_ratio", {
    value_type: "DECIMAL",
    unit: "ratio",
    measurement_method: "CATEGORY_PRESENCE",
    aggregation_scope: "CATEGORY_COVERAGE",
    coverage_requirement: "COMPLETE_CATEGORY_SET",
    zero_semantics: "PROVEN_EMPTY_SCOPE",
    radius_required: true,
  });
  add("context", "area", "classification", {
    value_type: "CATEGORY",
    unit: "category",
    measurement_method: "DETERMINISTIC_CLASSIFIER",
    aggregation_scope: "AREA_CONTEXT",
    coverage_requirement: "COMPLETE_AREA_FEATURES",
    zero_semantics: "NOT_ALLOWED",
    allowed_category_values: ["REGIONAL_LOW_TRANSIT", "SUBURBAN", "URBAN_GENERAL", "URBAN_TRANSIT"],
  });
  if (facts.length !== 61 || new Set(facts.map((f) => f.fact_key)).size !== 61)
    throw Error("Expected 61 independent contracts");
  return facts;
}
export const literal = (value) =>
  value === null
    ? "NULL"
    : Array.isArray(value)
      ? `ARRAY[${value.map(literal).join(",")}]::text[]`
      : typeof value === "boolean" || typeof value === "number"
        ? String(value)
        : `'${value.replaceAll("'", "''")}'`;
export const insert = (table, row) =>
  `INSERT INTO public.${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(literal).join(",")})`;

export function factContractTests() {
  const fixtures = factFixtures();
  const alternatives = {
    category: ["TRANSPORT", "RETAIL"],
    entity_taxonomy_key: ["rail_station", "clinic"],
    value_type: ["INTEGER", "DECIMAL"],
    unit: ["m", "s"],
    measurement_method: ["STRAIGHT_LINE", "WALKING_ROUTE"],
    aggregation_scope: ["WITHIN_RADIUS", "NEAREST_ELIGIBLE"],
    coverage_requirement: ["COMPLETE_RADIUS", "COMPLETE_CANDIDATE_SET"],
    zero_semantics: ["MEASURED_ZERO", "PROVEN_EMPTY_SCOPE"],
    radius_required: [true, false],
    duration_required: [true, false],
    allowed_category_values: [null, ["EXTRA"]],
  };
  let sql = "";
  for (const f of fixtures) {
    sql += `SELECT pg_temp.ok(${literal("valid " + f.fact_key)}, true);\n${insert("location_fact_definitions", f)};\n`;
    for (const [key, values] of Object.entries(alternatives)) {
      const bad = values.find((v) => JSON.stringify(v) !== JSON.stringify(f[key]));
      sql += `SELECT pg_temp.denied(${literal(f.fact_key + " mismatch " + key)},${literal(insert("location_fact_definitions", { ...f, definition_version: 2, [key]: bad }))},ARRAY['23514','23502']);\n`;
      if (key !== "allowed_category_values")
        sql += `SELECT pg_temp.denied(${literal(f.fact_key + " NULL " + key)},${literal(insert("location_fact_definitions", { ...f, definition_version: 2, [key]: null }))},ARRAY['23514','23502']);\n`;
    }
  }
  // Prove the declarative CHECK independently of the fact trigger.
  sql +=
    "ALTER TABLE public.location_fact_definitions DISABLE TRIGGER location_fact_definitions_guard;\n";
  for (const f of fixtures) {
    sql += `${insert("location_fact_definitions", { ...f, definition_version: 3 })};\n`;
    for (const [key, values] of Object.entries(alternatives)) {
      const bad = values.find((v) => JSON.stringify(v) !== JSON.stringify(f[key]));
      sql += `SELECT pg_temp.denied(${literal("CHECK " + f.fact_key + " " + key)},${literal(insert("location_fact_definitions", { ...f, definition_version: 4, [key]: bad }))},ARRAY['23514','23502']);\n`;
    }
  }
  sql +=
    "ALTER TABLE public.location_fact_definitions ENABLE TRIGGER location_fact_definitions_guard;\n";
  for (const key of [
    "road.major_road_access.count_within_radius",
    "transport.unknown.nearest_straight_line_m",
    "context.area.boolean",
  ])
    sql += `SELECT pg_temp.denied('unknown full key',${literal(insert("location_fact_definitions", { ...fixtures[0], fact_key: key }))},ARRAY['23514']);\n`;
  const context = fixtures.find((f) => f.fact_key === "context.area.classification");
  for (const labels of [
    [],
    ["SUBURBAN"],
    ["REGIONAL_LOW_TRANSIT", "SUBURBAN", "URBAN_GENERAL", "URBAN_TRANSIT", "EXTRA"],
    ["SUBURBAN", "SUBURBAN", "URBAN_GENERAL", "URBAN_TRANSIT"],
    ["REGIONAL_LOW_TRANSIT", null, "URBAN_GENERAL", "URBAN_TRANSIT"],
    [...context.allowed_category_values].reverse(),
  ])
    sql += `SELECT pg_temp.denied(${literal("context exact labels " + JSON.stringify(labels))},${literal(insert("location_fact_definitions", { ...context, definition_version: 8, allowed_category_values: labels }))},ARRAY['23514']);\n`;
  return sql;
}
