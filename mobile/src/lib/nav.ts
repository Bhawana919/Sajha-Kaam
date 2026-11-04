import type { Me } from '@/api/types';

/** Each role's first screen. */
export const homeFor = (me: Pick<Me, 'role'>) => `/${me.role}/${me.role === 'anchor' ? 'desk' : 'home'}`;
