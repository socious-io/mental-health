'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === 'en' ? 'ja' : 'en';

  return (
    <button
      onClick={() => router.replace(pathname, { locale: other })}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
    >
      {other === 'ja' ? '日本語' : 'English'}
    </button>
  );
}
