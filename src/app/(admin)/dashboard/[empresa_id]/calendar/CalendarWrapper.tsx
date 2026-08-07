'use client';

import dynamic from 'next/dynamic';

// O dynamic com ssr: false DEVE ser chamado dentro de um Client Component no App Router
const CalendarView = dynamic(() => import('./CalendarView'), { ssr: false });

export default function CalendarWrapper(props: any) {
  return <CalendarView {...props} />;
}
