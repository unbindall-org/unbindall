import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { commands } from "../src/features/generator/catalog/commands";
import { catalogConfigTypes } from "../src/features/generator/catalog/model";
import { isCommandAvailable } from "../src/features/generator/domain/config-types";
import { resources } from "../src/i18n/resources";

const translations = resources.en.translation as Record<string, string>;

function translated(value: string) {
  return translations[value] ?? value;
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function uuidForName(name: string) {
  const hash = createHash("sha256").update(`unbindall-command:${name}`).digest("hex").slice(0, 32).split("");
  hash[12] = "5";
  hash[16] = ((Number.parseInt(hash[16], 16) & 3) | 8).toString(16);
  const compact = hash.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

const columns = [
  "id", "name", "category", "control_type", "label_de", "label_en", "description_de", "description_en",
  "default_value", "enabled_by_default", "min", "max", "step", "unit", "options", "preview", "verification",
  "restrictions", "checked_version", "config_types", "sort_order", "published",
];

const values = commands.map((command, sortOrder) => {
  const options = (command.options ?? []).map((option) => ({
    value: option.value,
    label: { de: option.label, en: translated(option.label) },
  }));
  const configTypes = catalogConfigTypes.filter((type) => isCommandAvailable(type, command));
  const row = [
    sqlString(uuidForName(command.name)),
    sqlString(command.name),
    sqlString(command.category),
    sqlString(command.type),
    sqlString(command.label),
    sqlString(translated(command.label)),
    sqlString(command.description),
    sqlString(translated(command.description)),
    sqlJson(command.defaultValue),
    command.enabledByDefault ? "true" : "false",
    command.min ?? "NULL",
    command.max ?? "NULL",
    command.step ?? "NULL",
    command.unit ? sqlString(command.unit) : "NULL",
    sqlJson(options),
    command.preview ? sqlString(command.preview) : "NULL",
    sqlString(command.status.verification),
    `ARRAY[${command.status.restrictions.map(sqlString).join(", ")}]::text[]`,
    sqlString(command.status.checkedVersion),
    `ARRAY[${configTypes.map(sqlString).join(", ")}]::text[]`,
    sortOrder,
    "true",
  ];
  return `  (${row.join(", ")})`;
});

const sql = [
  `INSERT INTO "command_definitions" (${columns.map((column) => `"${column}"`).join(",")}) VALUES`,
  values.join(",\n"),
  "ON CONFLICT (\"name\") DO NOTHING;",
  "",
].join("\n");

const outputPath = process.argv[2];
if (outputPath) appendFileSync(outputPath, `\n${sql}`, "utf8");
else process.stdout.write(sql);
