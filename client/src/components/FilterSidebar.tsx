import type {FacetValue} from '../lib/types';

interface FacetGroupProps {
    title: string;
    hint: string;
    values: FacetValue[];
    selected: string[];
    onToggle: (value: string) => void;
}

function FacetGroup({title, hint, values, selected, onToggle}: FacetGroupProps) {
    // Keep selected values visible even if they fall outside the current top 20.
    const missing = selected.filter((s) => !values.some((v) => v.value === s)).map((value) => ({value, count: 0}));
    const items = [...missing, ...values];

    return (
        <section>
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
            <p className="mb-2 text-xs text-slate-400">{hint}</p>
            {items.length === 0 ? (
                <p className="text-sm text-slate-400">No values</p>
            ) : (
                <ul className="flex flex-col gap-0.5">
                    {items.map(({value, count}) => {
                        const checked = selected.includes(value);
                        return (
                            <li key={value}>
                                <label
                                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 ${checked ? 'bg-indigo-50 font-medium text-indigo-800' : 'text-slate-700'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggle(value)}
                                        className="size-4 accent-indigo-600"
                                    />
                                    <span className="flex-1 truncate">{value}</span>
                                    <span
                                        className="text-xs text-slate-500 tabular-nums">{count.toLocaleString()}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

interface Props {
    nationalities: FacetValue[];
    hobbies: FacetValue[];
    selectedNationalities: string[];
    selectedHobbies: string[];
    onToggleNationality: (value: string) => void;
    onToggleHobby: (value: string) => void;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    onRetry: () => void;
}

export function FilterSidebar(props: Props) {
    if (props.error) {
        return (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Could not load filters</p>
                <p className="text-red-600">{props.error.message}</p>
                <button type="button" onClick={props.onRetry} className="mt-2 font-medium underline">
                    Retry
                </button>
            </div>
        );
    }

    if (props.isLoading) {
        return (
            <div className="flex animate-pulse flex-col gap-2" aria-busy="true" aria-label="Loading filters">
                {Array.from({length: 12}, (_, i) => (
                    <div key={i} className="h-6 rounded bg-slate-200"/>
                ))}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-6 transition-opacity ${props.isFetching ? 'opacity-60' : ''}`}
             aria-busy={props.isFetching}>
            <FacetGroup
                title="Nationality"
                hint="Top 20 · matches any selected"
                values={props.nationalities}
                selected={props.selectedNationalities}
                onToggle={props.onToggleNationality}
            />
            <FacetGroup
                title="Hobbies"
                hint="Top 20 · matches all selected"
                values={props.hobbies}
                selected={props.selectedHobbies}
                onToggle={props.onToggleHobby}
            />
        </div>
    );
}
