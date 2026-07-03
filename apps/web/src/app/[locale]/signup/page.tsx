'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
  const t = useTranslations('auth');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Logo className="h-10 w-10" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('signupTitle')}</h1>
      <p className="mt-2 mb-8 max-w-sm text-center text-sm text-gray-600">{t('signupSubtitle')}</p>
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-gray-500">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-primary-600">{t('logIn')}</Link>
      </p>
    </main>
  );
}
