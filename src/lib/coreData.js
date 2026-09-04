/**
 * CARGA DEL ESQUEMA REAL DEL CORE (data/core-schema-real.json)
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "..", "data", "core-schema-real.json");

export const DEFAULTS = {
  constants: {
    default_commission_percent: { value: 10, source: "default" },
    driver_profit_percent: { value: 0.9, source: "default" },
  },
  models: {},
};

export function loadCoreSchema() {
  if (existsSync(SCHEMA_PATH)) {
    return JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  }
  return { warning: "core-schema-real.json no existe. Ejecuta: npm run extract", ...DEFAULTS };
}

export function coreConstant(schema, key) {
  return schema?.constants?.[key]?.value ?? DEFAULTS.constants[key].value;
}