import {useEffect, useRef} from 'react';
import {useVirtualizer} from '@tanstack/react-virtual';
import type {User} from '../lib/types';
import {useColumns} from '../lib/useColumns';
import {CARD_HEIGHT, UserCard, UserCardSkeleton} from './UserCard';

const GAP = 12;
const ROW_HEIGHT = CARD_HEIGHT + GAP;

interface Props {
    users: User[];
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    nextPageError: Error | null;
    fetchNextPage: () => void;
    /** Changes whenever the result set is replaced (new filters/sort) so we can jump back to the top. */
    resetKey: string;
}

export function UserList({users, hasNextPage, isFetchingNextPage, nextPageError, fetchNextPage, resetKey}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const columns = useColumns(scrollRef);
    const rowCount = Math.ceil(users.length / columns);
    const showFooter = hasNextPage || !!nextPageError;

    const virtualizer = useVirtualizer({
        count: rowCount + (showFooter ? 1 : 0),
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 4,
        paddingStart: 4,
        paddingEnd: 16,
    });

    useEffect(() => {
        virtualizer.scrollToOffset(0);
    }, [resetKey, virtualizer]);

    const items = virtualizer.getVirtualItems();
    const lastIndex = items.length ? items[items.length - 1].index : -1;

    // Prefetch the next page once the viewport gets within a few rows of the end.
    useEffect(() => {
        if (hasNextPage && !isFetchingNextPage && !nextPageError && lastIndex >= rowCount - 4) fetchNextPage();
    }, [lastIndex, rowCount, hasNextPage, isFetchingNextPage, nextPageError, fetchNextPage]);

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain px-4 lg:px-6" data-testid="user-list">
            <div className="relative w-full" style={{height: virtualizer.getTotalSize()}}>
                {items.map((row) => {
                    const isFooter = row.index >= rowCount;
                    return (
                        <div
                            key={row.key}
                            className="absolute top-0 left-0 w-full"
                            style={{height: ROW_HEIGHT, transform: `translateY(${row.start}px)`}}
                        >
                            {isFooter ? (
                                nextPageError ? (
                                    <div role="alert"
                                         className="flex items-center justify-center gap-3 text-sm text-red-700"
                                         style={{height: CARD_HEIGHT}}>
                                        Failed to load more users.
                                        <button type="button" onClick={fetchNextPage} className="font-medium underline">
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-3"
                                         style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}>
                                        {Array.from({length: columns}, (_, i) => (
                                            <UserCardSkeleton key={i}/>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="grid gap-3"
                                     style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}>
                                    {users.slice(row.index * columns, row.index * columns + columns).map((u) => (
                                        <UserCard key={u.id} user={u}/>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function UserListSkeleton() {
    return (
        <div className="grid gap-3 px-4 pt-1 sm:grid-cols-2 lg:px-6 2xl:grid-cols-3" aria-busy="true"
             aria-label="Loading users">
            {Array.from({length: 9}, (_, i) => (
                <UserCardSkeleton key={i}/>
            ))}
        </div>
    );
}
