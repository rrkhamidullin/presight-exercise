import { Faker, en } from '@faker-js/faker';
import type { Knex } from 'knex';

export const NATIONALITIES = [
  'American', 'British', 'Canadian', 'Australian', 'German', 'French', 'Italian', 'Spanish',
  'Portuguese', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Irish',
  'Greek', 'Turkish', 'Russian', 'Ukrainian', 'Indian', 'Pakistani', 'Chinese', 'Japanese',
  'Korean', 'Vietnamese', 'Thai', 'Filipino', 'Indonesian', 'Emirati', 'Saudi', 'Egyptian',
  'Moroccan', 'Nigerian', 'Kenyan', 'South African', 'Brazilian', 'Argentinian', 'Mexican',
  'Chilean',
];

export const HOBBIES = [
  'Reading', 'Writing', 'Painting', 'Drawing', 'Photography', 'Cooking', 'Baking', 'Gardening',
  'Hiking', 'Camping', 'Fishing', 'Cycling', 'Running', 'Swimming', 'Yoga', 'Meditation',
  'Chess', 'Board Games', 'Video Games', 'Knitting', 'Sewing', 'Woodworking', 'Pottery',
  'Dancing', 'Singing', 'Guitar', 'Piano', 'Drums', 'Traveling', 'Bird Watching', 'Astronomy',
  'Skiing', 'Snowboarding', 'Surfing', 'Rock Climbing', 'Tennis', 'Football', 'Basketball',
  'Volleyball', 'Golf', 'Martial Arts', 'Boxing', 'Calligraphy', 'Origami', 'Blogging',
  'Podcasting', 'Coding', 'Robotics', 'Collecting Coins', 'Wine Tasting',
];

/** Weighted pick so facet counts differ meaningfully instead of being uniform. */
function weightedIndex(faker: Faker, n: number): number {
  return Math.min(n - 1, Math.floor(n * Math.pow(faker.number.float({ min: 0, max: 1 }), 1.8)));
}

export async function seedDatabase(knex: Knex, count = 10_000, seed = 42): Promise<void> {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);

  await knex.transaction(async (trx) => {
    await trx('user_hobbies').del();
    await trx('users').del();
    await trx('hobbies').del();
    await trx('nationalities').del();
    await trx
      .raw("DELETE FROM sqlite_sequence WHERE name IN ('users', 'hobbies', 'nationalities')")
      .catch(() => undefined);

    await trx.batchInsert('hobbies', HOBBIES.map((name, i) => ({ id: i + 1, name })), 200);
    await trx.batchInsert('nationalities', NATIONALITIES.map((name, i) => ({ id: i + 1, name })), 200);

    const users: Record<string, unknown>[] = [];
    const links: Record<string, unknown>[] = [];
    for (let id = 1; id <= count; id++) {
      const sex = faker.person.sexType();
      users.push({
        id,
        first_name: faker.person.firstName(sex),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ mode: 'age', min: 18, max: 85 }).toISOString().slice(0, 10),
        nationality_id: weightedIndex(faker, NATIONALITIES.length) + 1,
        avatar: `https://randomuser.me/api/portraits/${sex === 'female' ? 'women' : 'men'}/${faker.number.int(99)}.jpg`,
      });

      const hobbyIds = new Set<number>();
      const hobbyCount = faker.number.int({ min: 0, max: 10 });
      while (hobbyIds.size < hobbyCount) hobbyIds.add(weightedIndex(faker, HOBBIES.length) + 1);
      [...hobbyIds].forEach((hobby_id, position) => links.push({ user_id: id, hobby_id, position }));
    }

    await trx.batchInsert('users', users, 250);
    await trx.batchInsert('user_hobbies', links, 250);
  });
}
