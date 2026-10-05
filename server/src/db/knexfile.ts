import path from 'node:path';
import fs from 'node:fs';
import type { Knex } from 'knex';

const filename = process.env.DB_FILE ?? path.resolve(__dirname, '../../data/presight.sqlite');
if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });

// Only load files matching the running build (.ts under tsx, .js from dist).
const loadExtensions = [path.extname(__filename)];

const config: Knex.Config = {
  client: 'sqlite3',
  connection: { filename },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
      conn.run('PRAGMA foreign_keys = ON', (err: Error | null) => done(err, conn));
    },
  },
  migrations: { directory: path.resolve(__dirname, 'migrations'), loadExtensions },
  seeds: { directory: path.resolve(__dirname, 'seeds'), loadExtensions },
};

export default config;
