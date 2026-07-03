'use client';

import { useTranslations } from 'next-intl';

export function CrisisCard({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations('crisis');
  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
      <p className="mt-3 text-gray-600">{t('body')}</p>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-left">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{t('label')}</p>
        <p className="mt-3 font-semibold text-gray-900">{t('line1')}</p>
        <p className="mt-1.5 font-semibold text-gray-900">{t('line2')}</p>
        <p className="mt-1.5 text-sm text-gray-600">{t('line3')}</p>
        <p className="mt-3 text-xs text-gray-500">{t('note')}</p>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 text-sm font-semibold text-primary-600 hover:text-primary-700"
      >
        {t('continue')}
      </button>
    </div>
  );
}
