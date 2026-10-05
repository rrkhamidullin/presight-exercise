import type {Knex} from 'knex';
import {ListParams, UserFilters} from './params';

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
    meta: { total: number; limit: number; offset: number; hasMore: boolean };
}

const escapeLike = (s: string) =>
    s.replace(/[\\%_]/g, (c) => `\\${c}`);

const selectUsers =
    (knex: Knex) => knex('users')
        .join('nationalities as n', 'n.id', 'users.nationality_id');

const SORT_COLUMNS: Record<ListParams['sort'], {
    column: string;
    field: Exclude<keyof User, 'hobbies'>;
    invert?: boolean
}> = {
    first_name: {column: 'users.first_name', field: 'first_name'},
    last_name: {column: 'users.last_name', field: 'last_name'},
    age: {column: 'users.date_of_birth', field: 'date_of_birth', invert: true},
    nationality: {column: 'n.name', field: 'nationality'},
};

function applyFilters(knex: Knex, queryBuilder: Knex.QueryBuilder, {q, nationalities, hobbies}: UserFilters) {

    for (const term of q.split(/\s+/).filter(Boolean)) {
        const like = `%${escapeLike(term)}%`;
        queryBuilder.where((queryBuilder2) =>
            queryBuilder2
                .whereRaw("users.first_name LIKE ? ESCAPE '\\'", [like])
                .orWhereRaw("users.last_name LIKE ? ESCAPE '\\'", [like])
        );
    }

    if (nationalities.length) {
        queryBuilder.whereIn('n.name', nationalities);
    }

    if (hobbies.length) {
        queryBuilder.whereIn(
            'users.id',
            knex('user_hobbies as uh')
                .join('hobbies as h', 'h.id', 'uh.hobby_id')
                .whereIn('h.name', hobbies)
                .groupBy('uh.user_id')
                .havingRaw('COUNT(*) = ?', [hobbies.length])
                .select('uh.user_id')
        );
    }
    return queryBuilder;
}

export async function listUsers(knex: Knex, params: ListParams): Promise<UserPage> {

    const {sort, order, limit, offset} = params;
    const {column, invert} = SORT_COLUMNS[sort];
    const direction = invert ? (order === 'asc' ? 'desc' : 'asc') : order;

    const selectUsersPage = applyFilters(knex, selectUsers(knex), params)
        .select('users.id', 'users.avatar', 'users.first_name', 'users.last_name', 'users.date_of_birth', {nationality: 'n.name'})
        .orderBy([{column: column, order: direction}, {column: 'users.id', order: direction}])
        .limit(limit + 1)
        .offset(offset);

    const [rows, totalRows] = await Promise.all([
        selectUsersPage,
        applyFilters(knex, selectUsers(knex), params)
            .count({total: '*'})
            .first()
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
    for (const {user_id, name} of hobbyRows) {
        const list = hobbiesByUser.get(user_id) ?? [];
        list.push(name);
        hobbiesByUser.set(user_id, list);
    }

    return {
        data: pageRows.map((r) => ({...r, hobbies: hobbiesByUser.get(r.id) ?? []})),
        meta: {
            total: Number((totalRows as { total: number } | undefined)?.total ?? 0),
            limit,
            offset,
            hasMore,
        },
    };
}

export async function getFacets(knex: Knex, filters: UserFilters, size = 20): Promise<{
    total: number;
    nationalities: FacetValue[];
    hobbies: FacetValue[]
}> {

    const selectUsersNoNationalitiesFilter = applyFilters(knex, selectUsers(knex), {...filters, nationalities: []});
    const selectUsersAllFilters = () => applyFilters(knex, selectUsers(knex), filters);
    const selectHobbiesFromSelectedUsers = knex('hobbies as h')
        .join('user_hobbies as uh', 'uh.hobby_id', 'h.id')
        .whereIn('uh.user_id', selectUsersAllFilters().select('users.id'));

    const [nationalities, hobbies, totalRows] = await Promise.all([

        selectUsersNoNationalitiesFilter
            .select({value: 'n.name'})
            .count({count: '*'})
            .groupBy('n.id', 'n.name')
            .orderBy([
                {column: 'count', order: 'desc'},
                {column: 'value', order: 'asc'}
            ])
            .limit(size),

        selectHobbiesFromSelectedUsers
            .select({value: 'h.name'})
            .count({count: '*'})
            .groupBy('h.id', 'h.name')
            .orderBy([
                {column: 'count', order: 'desc'},
                {column: 'value', order: 'asc'}
            ])
            .limit(size),

        selectUsersAllFilters()
            .count({total: '*'})
            .first(),
    ]);

    const toFacet = (rows: any[]): FacetValue[] =>
        rows.map((row) =>
            ({value: row.value, count: Number(row.count)}));

    return {
        total: Number((totalRows as { total: number } | undefined)?.total ?? 0),
        nationalities: toFacet(nationalities),
        hobbies: toFacet(hobbies),
    };
}
