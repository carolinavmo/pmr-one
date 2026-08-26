import { Client } from "pg";
import { readFileSync } from "fs";
const client = new Client({ connectionString: "postgresql://postgres:pmratlas_dev_local@localhost:5432/pmr_atlas" });
await client.connect();
const sql = readFileSync("db/migrations/0049_subsection_heading_block.sql", "utf-8");
await client.query(sql);
console.log("Applied 0049_subsection_heading_block.sql");
await client.end();
