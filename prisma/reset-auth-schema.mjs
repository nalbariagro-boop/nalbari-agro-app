import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is required to reset auth schema.");
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

await client.query(`
  drop table if exists users cascade;
  drop table if exists "User" cascade;
  drop type if exists "Role" cascade;
`);

await client.end();

console.log("Dropped old auth tables/enums. Run `npx prisma db push` next.");
