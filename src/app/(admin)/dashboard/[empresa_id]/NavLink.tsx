'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItem, navItemActive, navItemIdle } from './navStyles';

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link href={href} className={`${navItem} ${isActive ? navItemActive : navItemIdle}`}>
      {children}
    </Link>
  );
}
