'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useUser } from '@/lib/useUser';

export function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('shell');
  const router = useRouter();
  const { user, loading, logout } = useUser();

  if (!loading && !user && typeof window !== 'undefined') {
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-lg font-bold text-gray-900">Moya</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-gray-600 sm:inline">
                {user.handle}
                {user.identity_verified && <span className="ml-1.5 text-mint-600">✓</span>}
              </span>
            )}
            {user?.role === 'user' && (
              <Link href="/opportunities" className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('opps')}</Link>
            )}
            {user?.role === 'provider' && (
              <Link href="/portal" className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('portal')}</Link>
            )}
            {user?.role === 'org' && (
              <Link href="/console" className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('console')}</Link>
            )}
            <Link href="/privacy" className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('privacy')}</Link>
            <LocaleSwitcher />
            {user && (
              <button onClick={() => { logout(); router.replace('/'); }} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                {t('logout')}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
