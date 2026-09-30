import type { Knex } from 'knex';
import { encodeCursor, ListParams, UserFilters } from './params';

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  hobbies: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface UserPage {
  data: User[];
  meta: { total: number; limit: number; hasMore: boolean; nextCursor: string | null };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const usersWithNationality = (knex: Knex) => knex('users').join('nationalities as n', 'n.id', 'users.nationality_id');
// `field` is the selected row property used for the cursor; `invert` flips the direction
// (age ascending == date_of_birth descending).
const SORT_COLUMNS: Record<ListParams['sort'], { column: string; field: Exclude<keyof User, 'hobbies'>; invert?: boolean }> = {
  first_name: { column: 'users.first_name', field: 'first_name' },
  last_name: { column: 'users.last_name', field: 'last_name' },
  age: { column: 'users.date_of_birth', field: 'date_of_birth', invert: true },
  nationality: { column: 'n.name', field: 'nationality' },
};

/** Applies text, nationality (any-of) and hobby (all-of) filters to a query over `users`. */
function applyFilters(knex: Knex, qb: Knex.QueryBuilder, { q, nationalities, hobbies }: UserFilters) {
  // Every whitespace-separated term must match first_name or last_name, so "ann smi" finds "Anna Smith".
  for (const term of q.split(/\s+/).filter(Boolean)) {
    const like = `%${escapeLike(term)}%`;
    qb.where((w) =>
      w.whereRaw("users.first_name LIKE ? ESCAPE '\\'", [like]).orWhereRaw("users.last_name LIKE ? ESCAPE '\\'", [like]),
    );
  }

  if (nationalities.length) qb.whereIn('n.name', nationalities);

  if (hobbies.length) {
    qb.whereIn(
      'users.id',
      knex('user_hobbies as uh')
        .join('hobbies as h', 'h.id', 'uh.hobby_id')
        .whereIn('h.name', hobbies)
        .groupBy('uh.user_id')
        .havingRaw('COUNT(*) = ?', [hobbies.length])
        .select('uh.user_id'),
    );
  }
  return qb;
}

export async function listUsers(knex: Knex, params: ListParams): Promise<UserPage> {
  const { sort, order, limit, cursor } = params;
  const { column: col, field, invert } = SORT_COLUMNS[sort];
  const dir = invert ? (order === 'asc' ? 'desc' : 'asc') : order;
  const cmp = dir === 'asc' ? '>' : '<';

  const pageQuery = applyFilters(knex, usersWithNationality(knex), params)
    .select('users.id', 'users.avatar', 'users.first_name', 'users.last_name', 'users.date_of_birth', { nationality: 'n.name' })
    .orderBy([{ column: col, order: dir }, { column: 'users.id', order: dir }])
    .limit(limit + 1);

  // Keyset pagination: continue strictly after (value, id) of the last row, so the page
  // boundary is stable and never duplicates or skips rows.
  if (cursor) {
    pageQuery.where((w) =>
      w.where(col, cmp, cursor.value).orWhere((w2) => w2.where(col, cursor.value).andWhere('users.id', cmp, cursor.id)),
    );
  }

  const [rows, totalRow] = await Promise.all([
    pageQuery,
    applyFilters(knex, usersWithNationality(knex), params).count({ total: '*' }).first(),
  ]);

  const hasMore = rows.length > limit;
  const pageRows: Omit<User, 'hobbies'>[] = hasMore ? rows.slice(0, limit) : rows;

  const hobbyRows: { user_id: number; name: string }[] = pageRows.length
    ? await knex('user_hobbies as uh')
        .join('hobbies as h', 'h.id', 'uh.hobby_id')
        .whereIn(
          'uh.user_id',
          pageRows.map((r) => r.id),
        )
        .orderBy(['uh.user_id', 'uh.position'])
        .select('uh.user_id', 'h.name')
    : [];

  const hobbiesByUser = new Map<number, string[]>();
  for (const { user_id, name } of hobbyRows) {
    const list = hobbiesByUser.get(user_id) ?? [];
    list.push(name);
    hobbiesByUser.set(user_id, list);
  }

  const last = pageRows[pageRows.length - 1];
  return {
    data: pageRows.map((r) => ({ ...r, hobbies: hobbiesByUser.get(r.id) ?? [] })),
    meta: {
      total: Number((totalRow as { total: number } | undefined)?.total ?? 0),
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor({ sort, order, value: last[field] as string, id: last.id }) : null,
    },
  };
}

export async function getFacets(
  knex: Knex,
  filters: UserFilters,
  size = 20,
): Promise<{ total: number; nationalities: FacetValue[]; hobbies: FacetValue[] }> {
  const matching = () => applyFilters(knex, usersWithNationality(knex), filters);

  const [nationalities, hobbies, totalRow] = await Promise.all([
    applyFilters(knex, usersWithNationality(knex), { ...filters, nationalities: [] })
      .select({ value: 'n.name' })
      .count({ count: '*' })
      .groupBy('n.id', 'n.name')
      .orderBy([{ column: 'count', order: 'desc' }, { column: 'value', order: 'asc' }])
      .limit(size),
    knex('user_hobbies as uh')
      .join('hobbies as h', 'h.id', 'uh.hobby_id')
      .whereIn('uh.user_id', matching().select('users.id'))
      .select({ value: 'h.name' })
      .count({ count: '*' })
      .groupBy('h.id', 'h.name')
      .orderBy([{ column: 'count', order: 'desc' }, { column: 'value', order: 'asc' }])
      .limit(size),
    matching().count({ total: '*' }).first(),
  ]);

  const toFacet = (rows: any[]): FacetValue[] => rows.map((r) => ({ value: r.value, count: Number(r.count) }));
  return {
    total: Number((totalRow as { total: number } | undefined)?.total ?? 0),
    nationalities: toFacet(nationalities),
    hobbies: toFacet(hobbies),
  };
}
