import type {ReactNode} from 'react';

export function StatusMessage({
                                  tone = 'neutral',
                                  title,
                                  children,
                                  action,
                              }: {
    tone?: 'neutral' | 'error';
    title: string;
    children?: ReactNode;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div role={tone === 'error' ? 'alert' : 'status'}
             className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <p className={`text-lg font-semibold ${tone === 'error' ? 'text-red-700' : 'text-slate-800'}`}>{title}</p>
            {children && <p className="max-w-md text-sm text-slate-500">{children}</p>}
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
