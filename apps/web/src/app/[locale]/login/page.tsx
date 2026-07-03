'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const t = useTranslations('auth');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Logo className="h-10 w-10" />
      <h1 className="mt-4 mb-8 text-2xl font-bold text-gray-900">{t('loginTitle')}</h1>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-gray-500">
        {t('needAccount')}{' '}
        <Link href="/signup" className="font-semibold text-primary-600">{t('createAccount')}</Link>
      </p>
    </main>
  );
}
