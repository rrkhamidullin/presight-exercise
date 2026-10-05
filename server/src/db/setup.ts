import { createDb } from './knex';

/** Migrates and seeds only when the users table is empty, so restarts keep persisted data. */
(async () => {
  const db = createDb();
  await db.migrate.latest();
  const { n } = (await db('users').count({ n: '*' }).first()) as { n: number };
  if (Number(n) === 0) {
    await db.seed.run();
  } else {
    console.log(`Database already contains ${n} users`);
  }
  await db.destroy();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
