interface Props {
  q: string;
  nationalities: string[];
  hobbies: string[];
  onClearQuery: () => void;
  onRemoveNationality: (v: string) => void;
  onRemoveHobby: (v: string) => void;
  onClearAll: () => void;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-indigo-800">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full px-1.5 leading-5 hover:bg-indigo-200"
      >
        ×
      </button>
    </span>
  );
}

export function ActiveFilters({ q, nationalities, hobbies, onClearQuery, onRemoveNationality, onRemoveHobby, onClearAll }: Props) {
  if (!q && !nationalities.length && !hobbies.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {q && <Chip label={`“${q}”`} onRemove={onClearQuery} />}
      {nationalities.map((n) => (
        <Chip key={`n-${n}`} label={n} onRemove={() => onRemoveNationality(n)} />
      ))}
      {hobbies.map((h) => (
        <Chip key={`h-${h}`} label={h} onRemove={() => onRemoveHobby(h)} />
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 text-xs font-medium text-slate-500 underline hover:text-slate-800">
        Clear all
      </button>
    </div>
  );
}
