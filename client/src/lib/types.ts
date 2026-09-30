export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export interface Filters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface ViewState extends Filters {
  sort: SortField;
  order: SortOrder;
}

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  hobbies: string[];
}

export interface UserPage {
  data: User[];
  meta: { total: number; limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  total: number;
  nationalities: FacetValue[];
  hobbies: FacetValue[];
}

/** Full years elapsed since a `YYYY-MM-DD` date of birth. */
export function ageFromDateOfBirth(dob: string, now = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  const age = now.getFullYear() - y;
  return now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? age - 1 : age;
}
