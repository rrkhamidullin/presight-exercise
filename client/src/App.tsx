import {useMemo, useState} from 'react';
import {keepPreviousData, useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {fetchFacets, fetchUsers} from './lib/api';
import {useViewState} from './lib/useViewState';
import type {Filters} from './lib/types';
import {Toolbar} from './components/Toolbar';
import {FilterSidebar} from './components/FilterSidebar';
import {ActiveFilters} from './components/ActiveFilters';
import {UserList, UserListSkeleton} from './components/UserList';
import {StatusMessage} from './components/StatusMessage';

export default function App() {
    const view = useViewState();
    const {state} = view;
    const [filtersOpen, setFiltersOpen] = useState(false);

    const filters: Filters = useMemo(
        () => ({q: state.q, nationalities: state.nationalities, hobbies: state.hobbies}),
        [state.q, state.nationalities, state.hobbies],
    );

    const users = useInfiniteQuery({
        queryKey: ['users', state],
        queryFn: ({pageParam, signal}) => fetchUsers(state, pageParam, signal),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.meta.nextCursor,
        placeholderData: keepPreviousData,
    });

    const facets = useQuery({
        queryKey: ['facets', filters],
        queryFn: ({signal}) => fetchFacets(filters, signal),
        placeholderData: keepPreviousData,
    });

    const allUsers = useMemo(() => users.data?.pages.flatMap((p) => p.data) ?? [], [users.data]);
    const total = users.data?.pages[0]?.meta.total;
    const selectedCount = state.nationalities.length + state.hobbies.length;
    const hasFilters = !!state.q || selectedCount > 0;
    const resetKey = JSON.stringify(state);

    const sidebar = (
        <FilterSidebar
            nationalities={facets.data?.nationalities ?? []}
            hobbies={facets.data?.hobbies ?? []}
            selectedNationalities={state.nationalities}
            selectedHobbies={state.hobbies}
            onToggleNationality={view.toggleNationality}
            onToggleHobby={view.toggleHobby}
            isLoading={facets.isPending}
            isFetching={facets.isFetching}
            error={facets.isError ? facets.error : null}
            onRetry={() => facets.refetch()}
        />
    );

    let content;
    if (users.isPending) {
        content = <UserListSkeleton/>;
    } else if (users.isError && !users.data) {
        content = (
            <StatusMessage tone="error" title="Could not load users"
                           action={{label: 'Try again', onClick: () => users.refetch()}}>
                {users.error.message}
            </StatusMessage>
        );
    } else if (allUsers.length === 0) {
        content = (
            <StatusMessage
                title="No users found"
                action={hasFilters ? {label: 'Clear filters', onClick: view.clearFilters} : undefined}
            >
                {hasFilters ? 'Try a different search or remove some filters.' : 'The directory is empty. Seed the database to get started.'}
            </StatusMessage>
        );
    } else {
        content = (
            <UserList
                users={allUsers}
                hasNextPage={users.hasNextPage}
                isFetchingNextPage={users.isFetchingNextPage}
                nextPageError={users.isFetchNextPageError ? users.error : null}
                fetchNextPage={() => void users.fetchNextPage()}
                resetKey={resetKey}
            />
        );
    }

    return (
        <div className="flex h-dvh flex-col text-slate-900">
            <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-lg font-bold">User Directory</h1>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(true)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium lg:hidden"
                        >
                            Filters{selectedCount ? ` (${selectedCount})` : ''}
                        </button>
                    </div>
                    <Toolbar
                        query={state.q}
                        sort={state.sort}
                        order={state.order}
                        onQueryChange={view.setQuery}
                        onSortChange={view.setSort}
                        onOrderChange={view.setOrder}
                    />
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block"
                       aria-label="Filters">
                    {sidebar}
                </aside>

                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-col gap-2 px-4 py-3 lg:px-6">
                        <div className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
                            {total !== undefined && (
                                <span>
                  <strong className="text-slate-900">{total.toLocaleString()}</strong> {total === 1 ? 'user' : 'users'}
                </span>
                            )}
                            {users.isPlaceholderData && <span className="text-slate-400">Updating…</span>}
                        </div>
                        <ActiveFilters
                            q={state.q}
                            nationalities={state.nationalities}
                            hobbies={state.hobbies}
                            onClearQuery={() => view.setQuery('')}
                            onRemoveNationality={view.toggleNationality}
                            onRemoveHobby={view.toggleHobby}
                            onClearAll={view.clearFilters}
                        />
                    </div>
                    <div
                        className={`min-h-0 flex-1 transition-opacity ${users.isPlaceholderData ? 'opacity-60' : ''}`}>{content}</div>
                </main>
            </div>

            {filtersOpen && (
                <div className="fixed inset-0 z-20 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setFiltersOpen(false)}/>
                    <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <h2 className="font-semibold">Filters</h2>
                            <button type="button" onClick={() => setFiltersOpen(false)}
                                    className="rounded px-2 py-1 text-sm font-medium hover:bg-slate-100">
                                Done
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
