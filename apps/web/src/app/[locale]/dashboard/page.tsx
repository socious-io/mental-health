'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Shell } from '@/components/Shell';
import { VerifyModal } from '@/components/VerifyModal';
import { api, Screening } from '@/lib/api';
import { useUser } from '@/lib/useUser';

export default function Dashboard() {
  const t = useTranslations('dashboard');
  const { user, refresh } = useUser();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [screening, setScreening] = useState<Screening | null>(null);

  useEffect(() => {
    api<Screening>('/screenings/latest').then(setScreening).catch(() => setScreening(null));
  }, []);

  const onVerified = useCallback(() => { refresh(); }, [refresh]);

  return (
    <Shell>
      {user && !user.identity_verified && (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-primary-800">{t('verifyBannerTitle')}</p>
            <p className="mt-0.5 text-sm text-primary-700">{t('verifyBannerBody')}</p>
          </div>
          <button
            onClick={() => setVerifyOpen(true)}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {t('verifyNow')}
          </button>
        </div>
      )}
      {user?.identity_verified && (
        <div className="mb-6 rounded-xl border border-mint-100 bg-mint-50 p-4 text-sm font-medium text-mint-700">
          {t('verifiedBanner')}
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900">{t('title', { handle: user?.handle ?? '…' })}</h1>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-bold text-gray-900">{t('screeningCard')}</h2>
          <p className="mt-1.5 text-sm text-gray-600">{t('screeningBody')}</p>
          {screening && (
            <p className="mt-3 text-sm">
              {t('lastResult')}: <span className="font-semibold text-primary-700">{t(`band_${screening.band}`)}</span>
              {' '}({screening.score}/27)
            </p>
          )}
          <Link
            href="/screening"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {screening ? t('screenAgain') : t('startScreening')}
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-bold text-gray-900">{t('matchesCard')}</h2>
          <p className="mt-1.5 text-sm text-gray-600">{t('matchesBody')}</p>
          <Link
            href="/matches"
            className={`mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold ${
              screening
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'pointer-events-none bg-gray-200 text-gray-400'
            }`}
          >
            {t('seeMatches')}
          </Link>
        </div>
      </div>
      <VerifyModal open={verifyOpen} onClose={() => setVerifyOpen(false)} onVerified={onVerified} />
    </Shell>
  );
}
