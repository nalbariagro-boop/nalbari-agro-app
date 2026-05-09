import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`);

console.log("tables", tables.rows.map((row) => row.table_name));

const columns = await client.query(`
  select table_name, column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position
`);

for (const row of columns.rows) {
  console.log(
    `${row.table_name}.${row.column_name}: ${row.data_type} nullable=${row.is_nullable}`
  );
}

const enums = await client.query(`
  select t.typname as enum_name, e.enumlabel as enum_value
  from pg_type t
  join pg_enum e on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder
`);

for (const row of enums.rows) {
  console.log(`enum ${row.enum_name}: ${row.enum_value}`);
}

await client.end();
