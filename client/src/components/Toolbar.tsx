import { useEffect, useRef, useState } from 'react';
import { SORT_FIELDS, type SortField, type SortOrder } from '../lib/types';

const SORT_LABELS: Record<SortField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  age: 'Age',
  nationality: 'Nationality',
};

interface Props {
  query: string;
  sort: SortField;
  order: SortOrder;
  onQueryChange: (q: string) => void;
  onSortChange: (sort: SortField) => void;
  onOrderChange: (order: SortOrder) => void;
}

export function Toolbar({ query, sort, order, onQueryChange, onSortChange, onOrderChange }: Props) {
  const [text, setText] = useState(query);
  const lastSent = useRef(query);

  // Adopt URL changes that did not originate from typing (back/forward, "clear filters").
  useEffect(() => {
    if (query !== lastSent.current) {
      lastSent.current = query;
      setText(query);
    }
  }, [query]);

  useEffect(() => {
    const next = text.trim();
    if (next === lastSent.current) return;
    const t = setTimeout(() => {
      lastSent.current = next;
      onQueryChange(next);
    }, 300);
    return () => clearTimeout(t);
  }, [text, onQueryChange]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search by first or last name</span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by first or last name…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <div className="flex gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="hidden sm:inline">Sort by</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortField)}
            aria-label="Sort field"
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm"
          >
            {SORT_FIELDS.map((f) => (
              <option key={f} value={f}>
                {SORT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onOrderChange(order === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort direction: ${order === 'asc' ? 'ascending' : 'descending'}`}
          title="Toggle sort direction"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          {order === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>
    </div>
  );
}
