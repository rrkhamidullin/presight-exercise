import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';
import {SORT_FIELDS, type SortField, type SortOrder, type ViewState} from './types';

const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

/** View state lives entirely in the URL query string so reloads and shared links restore it. */
export function useViewState() {
    const [params, setParams] = useSearchParams();

    const state = useMemo<ViewState>(() => {
        const sort = params.get('sort') as SortField;
        const order = params.get('order');
        return {
            q: params.get('q')?.trim() ?? '',
            nationalities: unique(params.getAll('nationality')),
            hobbies: unique(params.getAll('hobby')),
            sort: SORT_FIELDS.includes(sort) ? sort : 'first_name',
            order: order === 'desc' ? 'desc' : 'asc',
        };
    }, [params]);

    const update = useCallback(
        (patch: Partial<ViewState>, options?: { replace?: boolean }) => {
            // Read the live URL rather than the router's `prev`, which can be stale when two
            // updates land before React re-renders (router navigations run in a transition).
            const prev = new URLSearchParams(window.location.search);
            setParams(
                () => {
                    const current = {
                        q: prev.get('q') ?? '',
                        nationalities: prev.getAll('nationality'),
                        hobbies: prev.getAll('hobby'),
                        sort: prev.get('sort') ?? '',
                        order: prev.get('order') ?? '',
                        ...patch,
                    };
                    const next = new URLSearchParams();
                    if (current.q) next.set('q', current.q);
                    unique(current.nationalities).forEach((n) => next.append('nationality', n));
                    unique(current.hobbies).forEach((h) => next.append('hobby', h));
                    if (current.sort) next.set('sort', current.sort);
                    if (current.order) next.set('order', current.order);
                    return next;
                },
                {replace: options?.replace},
            );
        },
        [setParams],
    );

    const toggle = useCallback(
        (key: 'nationalities' | 'hobbies', value: string) => {
            const list = new URLSearchParams(window.location.search).getAll(key === 'hobbies' ? 'hobby' : 'nationality');
            update({[key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value]});
        },
        [update],
    );

    const actions = useMemo(
        () => ({
            setQuery: (q: string) => update({q}, {replace: true}),
            setSort: (sort: SortField) => update({sort}),
            setOrder: (order: SortOrder) => update({order}),
            toggleNationality: (value: string) => toggle('nationalities', value),
            toggleHobby: (value: string) => toggle('hobbies', value),
            clearFilters: () => update({q: '', nationalities: [], hobbies: []}),
        }),
        [update, toggle],
    );

    return {state, ...actions};
}
