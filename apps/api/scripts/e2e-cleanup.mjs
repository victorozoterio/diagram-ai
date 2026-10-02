import pg from 'pg';
import { getE2EDatabaseURL } from './e2e-database.mjs';

const databaseURL = getE2EDatabaseURL();
const client = new pg.Client({ connectionString: databaseURL.toString() });

try {
  await client.connect();
  await client.query('DELETE FROM "User" WHERE email = $1', ['e2e-login@diagram-ai.test']);
} finally {
  await client.end();
}
