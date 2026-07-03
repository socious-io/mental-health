'use client';

import { useTranslations } from 'next-intl';
import { Shell } from '@/components/Shell';

export default function PrivacyPage() {
  const t = useTranslations('ledger');
  const knows = ['handle', 'email', 'band', 'credentials'] as const;
  const nevers = ['name', 'phone', 'answers', 'documents'] as const;
  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">{t('subtitle')}</p>
        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700">{t('knowsLabel')}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {knows.map((k) => (
              <li key={k} className="text-sm text-gray-700">✓&ensp;{t(`knows_${k}`)}</li>
            ))}
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('neverLabel')}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {nevers.map((k) => (
              <li key={k} className="text-sm text-gray-500">✕&ensp;{t(`never_${k}`)}</li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-gray-500">{t('how')}</p>
        <p className="mt-2 text-xs text-gray-400">
          {t('openSource')} <a className="underline" href="https://github.com/socious-io/mental-health" target="_blank" rel="noreferrer">github.com/socious-io/mental-health</a>
        </p>
      </div>
    </Shell>
  );
}
