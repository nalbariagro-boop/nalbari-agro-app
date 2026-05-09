import "dotenv/config";
import pg from "pg";

const urls = [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["DIRECT_URL", process.env.DIRECT_URL],
];

for (const [name, connectionString] of urls) {
  if (!connectionString) {
    console.log(`${name}: missing`);
    continue;
  }

  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const result = await client.query(
      "select current_user, current_database(), now()"
    );
    console.log(`${name}: ok`, result.rows[0]);
  } catch (error) {
    console.error(`${name}: failed`);
    console.error(error instanceof Error ? error.message : error);
  } finally {
    await client.end().catch(() => {});
  }
}
