import type {Knex} from 'knex';
import {seedDatabase} from '../seedData';

export async function seed(knex: Knex): Promise<void> {
    const count = Number(process.env.SEED_COUNT ?? 10_000);
    await seedDatabase(knex, count);
    console.log(`Seeded ${count} users`);
}
