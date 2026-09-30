export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export interface UserFilters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface ListParams extends UserFilters {
  sort: SortField;
  order: SortOrder;
  limit: number;
  cursor: Cursor | null;
}

export interface Cursor {
  sort: SortField;
  order: SortOrder;
  value: string | number;
  id: number;
}

export class BadRequestError extends Error {}

type QueryValue = unknown;

function toList(value: QueryValue): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const cleaned = raw.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

function toSingle(value: QueryValue): string | undefined {
  if (Array.isArray(value)) value = value[0];
  return typeof value === 'string' ? value : undefined;
}

export function parseFilters(query: Record<string, QueryValue>): UserFilters {
  return {
    q: (toSingle(query.q) ?? '').trim().slice(0, 100),
    nationalities: toList(query.nationality),
    hobbies: toList(query.hobby),
  };
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify([cursor.sort, cursor.order, cursor.value, cursor.id])).toString('base64url');
}

export function decodeCursor(raw: string): Cursor {
  try {
    const [sort, order, value, id] = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      SORT_FIELDS.includes(sort) &&
      (order === 'asc' || order === 'desc') &&
      (typeof value === 'string' || typeof value === 'number') &&
      Number.isInteger(id)
    ) {
      return { sort, order, value, id };
    }
  } catch {
    // fall through
  }
  throw new BadRequestError('Invalid cursor');
}

export function parseListParams(query: Record<string, QueryValue>): ListParams {
  const sort = (toSingle(query.sort) ?? 'first_name') as SortField;
  if (!SORT_FIELDS.includes(sort)) throw new BadRequestError(`sort must be one of ${SORT_FIELDS.join(', ')}`);

  const order = (toSingle(query.order) ?? 'asc') as SortOrder;
  if (order !== 'asc' && order !== 'desc') throw new BadRequestError('order must be asc or desc');

  const limitRaw = toSingle(query.limit);
  const limit = limitRaw === undefined ? 50 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new BadRequestError('limit must be an integer 1-200');

  const cursorRaw = toSingle(query.cursor);
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursor && (cursor.sort !== sort || cursor.order !== order)) {
    throw new BadRequestError('cursor does not match the requested sort');
  }

  return { ...parseFilters(query), sort, order, limit, cursor };
}
