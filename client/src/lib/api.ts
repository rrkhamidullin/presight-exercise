import type {Facets, Filters, UserPage, ViewState} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function filterParams({q, nationalities, hobbies}: Filters): URLSearchParams {
    const params = new URLSearchParams();
    if (q) {
        params.set('q', q);
    }
    nationalities.forEach((n) => params.append('nationality', n));
    hobbies.forEach((h) => params.append('hobby', h));
    return params;
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${API_BASE}${path}?${params}`, {signal});
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export const PAGE_SIZE = 60;

export function fetchUsers(state: ViewState, cursor: string | null, signal?: AbortSignal) {
    const params = filterParams(state);
    params.set('sort', state.sort);
    params.set('order', state.order);
    params.set('limit', String(PAGE_SIZE));
    if (cursor) {
        params.set('cursor', cursor);
    }
    return getJson<UserPage>('/api/users', params, signal);
}

export function fetchFacets(filters: Filters, signal?: AbortSignal) {
    return getJson<Facets>('/api/users/facets', filterParams(filters), signal);
}
