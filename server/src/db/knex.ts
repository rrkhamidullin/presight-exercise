import knexFactory, { Knex } from 'knex';
import config from './knexfile';

export function createDb(filename?: string): Knex {
  return knexFactory(filename ? { ...config, connection: { filename } } : config);
}
