'use server'

import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';

// O cookie de sessão é httpOnly: só o servidor consegue removê-lo
export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}
