import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-bold text-gray-900">Moya</span>
        </div>
        <LocaleSwitcher />
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-6">
        <Logo className="h-14 w-14" />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 max-w-2xl leading-tight">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 max-w-xl">{t('subtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/signup"
            className="rounded-lg bg-primary-600 px-6 py-3 text-white font-semibold hover:bg-primary-700 transition"
          >
            {t('cta')}
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            {t('login')}
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">{t('privacy')}</p>
      </section>
      <footer className="text-center text-xs text-gray-400 py-6">
        {t('footer')} · <a className="underline" href="https://github.com/socious-io/mental-health">GitHub</a>
      </footer>
    </main>
  );
}
