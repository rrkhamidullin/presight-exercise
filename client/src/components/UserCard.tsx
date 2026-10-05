import { memo, useState } from 'react';
import { ageFromDateOfBirth, type User } from '../lib/types';

export const CARD_HEIGHT = 124;

function Avatar({ user }: { user: User }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
        {user.first_name[0]}
        {user.last_name[0]}
      </div>
    );
  }
  return (
    <img
      src={user.avatar}
      alt=""
      loading="lazy"
      width={56}
      height={56}
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-full bg-slate-200 object-cover"
    />
  );
}

export const UserCard = memo(function UserCard({ user }: { user: User }) {
  const shown = user.hobbies.slice(0, 2);
  const rest = user.hobbies.length - shown.length;
  return (
    <article
      className="flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      style={{ height: CARD_HEIGHT }}
    >
      <Avatar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-right font-semibold text-slate-900">
          {user.first_name} {user.last_name}
        </h3>
        <div className="flex justify-between gap-2 text-sm text-slate-500">
          <span className="truncate">{user.nationality}</span>
          <span className="shrink-0" title={user.date_of_birth}>{ageFromDateOfBirth(user.date_of_birth)}</span>
        </div>
        <div className="mt-auto flex min-w-0 gap-1.5 overflow-hidden">
          {shown.map((h) => (
            <span key={h} className="truncate rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {h}
            </span>
          ))}
          {rest > 0 && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600" title={user.hobbies.slice(2).join(', ')}>
              +{rest}
            </span>
          )}
          {user.hobbies.length === 0 && <span className="text-xs text-slate-400">No hobbies</span>}
        </div>
      </div>
    </article>
  );
});

export function UserCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-xl border border-slate-200 bg-white p-4" style={{ height: CARD_HEIGHT }}>
      <div className="size-14 rounded-full bg-slate-200" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="ml-auto h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="mt-auto h-5 w-1/2 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
