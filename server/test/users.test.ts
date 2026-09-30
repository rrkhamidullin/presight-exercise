import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { Knex } from 'knex';
import { createApp } from '../src/app';
import { createDb } from '../src/db/knex';
import { seedDatabase } from '../src/db/seedData';
import type { User } from '../src/users/repository';

let db: Knex;
let server: Server;
let base: string;
let all: User[];

async function get(path: string) {
  const res = await fetch(base + path);
  return { status: res.status, body: (await res.json()) as any };
}

async function fetchAll(query: string, limit = 37): Promise<User[]> {
  const out: User[] = [];
  let hasMore = true;
  while (hasMore) {
    const { status, body } = await get(`/api/users?${query}&limit=${limit}&offset=${out.length}`);
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.meta.offset, out.length);
    out.push(...body.data);
    hasMore = body.meta.hasMore;
    assert.equal(hasMore, out.length < body.meta.total);
  }
  return out;
}

function facet(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
    .slice(0, 20);
}

before(async () => {
  db = createDb(':memory:');
  await db.migrate.latest();
  await seedDatabase(db, 600, 7);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  all = await fetchAll('sort=first_name&order=asc', 200);
});

after(async () => {
  server?.closeAllConnections();
  server?.close();
  await db?.destroy();
});

describe('GET /api/users', () => {
  test('returns every user exactly once', () => {
    assert.equal(all.length, 600);
    assert.equal(new Set(all.map((u) => u.id)).size, 600);
    assert.ok(all.every((u) => u.hobbies.length <= 10));
  });

  for (const sort of ['first_name', 'last_name', 'age', 'nationality'] as const) {
    for (const order of ['asc', 'desc'] as const) {
      test(`paginates deterministically by ${sort} ${order}`, async () => {
        const got = await fetchAll(`sort=${sort}&order=${order}`);
        // Age ascending == date_of_birth descending.
        const key = sort === 'age' ? 'date_of_birth' : sort;
        const dir = (order === 'asc' ? 1 : -1) * (sort === 'age' ? -1 : 1);
        const expected = [...all].sort((a, b) =>
          a[key] < b[key] ? -dir : a[key] > b[key] ? dir : (a.id - b.id) * dir,
        );
        assert.deepEqual(got.map((u) => u.id), expected.map((u) => u.id));
      });
    }
  }

  test('combines text, nationality (any) and hobby (all) filters', async () => {
    const sample = all.find((u) => u.hobbies.length >= 2)!;
    const hobbies = sample.hobbies.slice(0, 2);
    const nats = [sample.nationality, all.find((u) => u.nationality !== sample.nationality)!.nationality];
    const term = sample.first_name.slice(0, 2).toLowerCase();

    const qs = new URLSearchParams({ q: term, sort: 'age', order: 'desc' });
    nats.forEach((n) => qs.append('nationality', n));
    hobbies.forEach((h) => qs.append('hobby', h));

    const got = await fetchAll(qs.toString(), 5);
    const expected = all.filter(
      (u) =>
        (u.first_name.toLowerCase().includes(term) || u.last_name.toLowerCase().includes(term)) &&
        nats.includes(u.nationality) &&
        hobbies.every((h) => u.hobbies.includes(h)),
    );
    assert.ok(got.some((u) => u.id === sample.id));
    assert.deepEqual(new Set(got.map((u) => u.id)), new Set(expected.map((u) => u.id)));

    const { body } = await get(`/api/users?${qs}&limit=1`);
    assert.equal(body.meta.total, expected.length);
  });

  test('matches multi-word search across first and last name', async () => {
    const u = all[123];
    const got = await fetchAll(`q=${encodeURIComponent(`${u.first_name} ${u.last_name}`)}`);
    assert.ok(got.some((x) => x.id === u.id));
  });

  test('treats LIKE wildcards literally', async () => {
    const { body } = await get('/api/users?q=%25');
    assert.equal(body.meta.total, 0);
  });

  test('rejects invalid params', async () => {
    assert.equal((await get('/api/users?sort=id')).status, 400);
    assert.equal((await get('/api/users?order=up')).status, 400);
    assert.equal((await get('/api/users?limit=0')).status, 400);
    assert.equal((await get('/api/users?offset=-1')).status, 400);
    assert.equal((await get('/api/users?offset=1.5')).status, 400);
    assert.equal((await get('/api/users?offset=abc')).status, 400);
  });
});

describe('GET /api/users/facets', () => {
  test('returns global top 20 when unfiltered', async () => {
    const { body } = await get('/api/users/facets');
    assert.equal(body.total, 600);
    assert.deepEqual(body.nationalities, facet(all.map((u) => u.nationality)));
    assert.deepEqual(body.hobbies, facet(all.flatMap((u) => u.hobbies)));
  });

  test('reflects the active filters', async () => {
    const hobby = all.find((u) => u.hobbies.length)!.hobbies[0];
    const qs = new URLSearchParams({ q: 'a', hobby });
    const { body } = await get(`/api/users/facets?${qs}`);
    const subset = all.filter(
      (u) => (u.first_name.toLowerCase().includes('a') || u.last_name.toLowerCase().includes('a')) && u.hobbies.includes(hobby),
    );
    assert.equal(body.total, subset.length);
    assert.deepEqual(body.nationalities, facet(subset.map((u) => u.nationality)));
    assert.deepEqual(body.hobbies, facet(subset.flatMap((u) => u.hobbies)));
  });

  test('nationality facet ignores the selected nationalities (any-of)', async () => {
    const hobby = all.find((u) => u.hobbies.length)!.hobbies[0];
    const nationality = all[0].nationality;
    const qs = new URLSearchParams({ hobby, nationality });
    const { body } = await get(`/api/users/facets?${qs}`);
    const byHobby = all.filter((u) => u.hobbies.includes(hobby));
    const subset = byHobby.filter((u) => u.nationality === nationality);
    assert.equal(body.total, subset.length);
    assert.deepEqual(body.nationalities, facet(byHobby.map((u) => u.nationality)));
    assert.deepEqual(body.hobbies, facet(subset.flatMap((u) => u.hobbies)));
  });
});
