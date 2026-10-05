import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('nationalities', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable().unique();
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('avatar').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.date('date_of_birth').notNullable();
    t.integer('nationality_id').notNullable().references('nationalities.id');
    // Composite indexes back sorted pagination for every sortable column.
    t.index(['first_name', 'id']);
    t.index(['last_name', 'id']);
    t.index(['date_of_birth', 'id']);
    t.index(['nationality_id', 'id']);
  });

  await knex.schema.createTable('hobbies', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable().unique();
  });

  await knex.schema.createTable('user_hobbies', (t) => {
    t.integer('user_id').notNullable().references('users.id').onDelete('CASCADE');
    t.integer('hobby_id').notNullable().references('hobbies.id').onDelete('CASCADE');
    t.integer('position').notNullable();
    t.primary(['user_id', 'hobby_id']);
    t.index(['hobby_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_hobbies');
  await knex.schema.dropTableIfExists('hobbies');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('nationalities');
}
