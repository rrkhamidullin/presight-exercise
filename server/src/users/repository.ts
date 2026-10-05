import type {Knex} from 'knex';
import {encodeCursor, ListParams, UserFilters} from './params';

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

const escapeLike = (s: string) =>
    s.replace(/[\\%_]/g, (c) => `\\${c}`);

const selectUsersWithNationality =
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

    const {sort, order, limit, cursor} = params;
    const {column: column, field, invert} = SORT_COLUMNS[sort];
    const direction = invert ? (order === 'asc' ? 'desc' : 'asc') : order;
    const comparingOperator = direction === 'asc' ? '>' : '<';

    const pageQuery = applyFilters(knex, selectUsersWithNationality(knex), params)
        .select('users.id', 'users.avatar', 'users.first_name', 'users.last_name', 'users.date_of_birth', {nationality: 'n.name'})
        .orderBy([{column: column, order: direction}, {column: 'users.id', order: direction}])
        .limit(limit + 1);

    if (cursor) {
        pageQuery.where((queryBuilder) =>
            queryBuilder
                .where(column, comparingOperator, cursor.value)
                .orWhere((queryBuilder2) =>
                    queryBuilder2
                        .where(column, cursor.value)
                        .andWhere('users.id', comparingOperator, cursor.id))
        );
    }

    const [rows, totalRow] = await Promise.all([
        pageQuery,
        applyFilters(knex, selectUsersWithNationality(knex), params)
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

    const last = pageRows[pageRows.length - 1];
    return {
        data: pageRows.map((r) => ({...r, hobbies: hobbiesByUser.get(r.id) ?? []})),
        meta: {
            total: Number((totalRow as { total: number } | undefined)?.total ?? 0),
            limit,
            hasMore,
            nextCursor: hasMore && last ? encodeCursor({sort, order, value: last[field] as string, id: last.id}) : null,
        },
    };
}

export async function getFacets(knex: Knex, filters: UserFilters, size = 20,): Promise<{
    total: number;
    nationalities: FacetValue[];
    hobbies: FacetValue[]
}> {

    const allUsersQuery = selectUsersWithNationality(knex);
    const filteredUsersQuery = () => applyFilters(knex, allUsersQuery, filters);

    const nationalitiesFilters = {...filters, nationalities: []};

    const [nationalities, hobbies, totalRows] = await Promise.all([

        applyFilters(knex, allUsersQuery, nationalitiesFilters)
            .select({value: 'n.name'})
            .count({count: '*'})
            .groupBy('n.id', 'n.name')
            .orderBy([{column: 'count', order: 'desc'}, {column: 'value', order: 'asc'}])
            .limit(size),

        knex('user_hobbies as uh')
            .join('hobbies as h', 'h.id', 'uh.hobby_id')
            .whereIn('uh.user_id', filteredUsersQuery()
                .select('users.id'))
            .select({value: 'h.name'})
            .count({count: '*'})
            .groupBy('h.id', 'h.name')
            .orderBy([{column: 'count', order: 'desc'}, {column: 'value', order: 'asc'}])
            .limit(size),

        filteredUsersQuery()
            .count({total: '*'})
            .first()
    ]);

    const toFacet = (rows: any[]): FacetValue[] => rows.map((r) =>
        ({value: r.value, count: Number(r.count)}));

    return {
        total: Number((totalRows as { total: number } | undefined)?.total ?? 0),
        nationalities: toFacet(nationalities),
        hobbies: toFacet(hobbies),
    };
}
