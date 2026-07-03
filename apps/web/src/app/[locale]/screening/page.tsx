'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Shell } from '@/components/Shell';
import { PHQ9 } from '@/components/PHQ9';
import { CrisisCard } from '@/components/CrisisCard';
import { Screening } from '@/lib/api';

type Stage = 'intro' | 'questions' | 'crisis' | 'result';

export default function ScreeningPage() {
  const t = useTranslations('screening');
  const [stage, setStage] = useState<Stage>('intro');
  const [result, setResult] = useState<Screening | null>(null);
  const [claimUrl, setClaimUrl] = useState('');

  return (
    <Shell>
      {stage === 'intro' && (
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('introTitle')}</h1>
          <p className="mt-3 text-gray-600">{t('introBody')}</p>
          <p className="mt-3 text-sm text-gray-500">{t('introPrivacy')}</p>
          <button
            onClick={() => setStage('questions')}
            className="mt-6 rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {t('begin')}
          </button>
        </div>
      )}
      {stage === 'questions' && (
        <PHQ9
          onDone={(s, crisis, claim) => {
            setResult(s);
            setClaimUrl(claim);
            setStage(crisis ? 'crisis' : 'result');
          }}
        />
      )}
      {stage === 'crisis' && <CrisisCard onContinue={() => setStage('result')} />}
      {stage === 'result' && result && (
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary-600 bg-primary-50">
            <span className="text-3xl font-bold text-primary-700">{result.score}</span>
          </div>
          <p className="mt-4 inline-block rounded-full bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            {t(`band_${result.band}`)}
          </p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('resultTitle')}</h1>
          <p className="mt-3 text-gray-600">{t(`explain_${result.band}`)}</p>
          <p className="mt-3 text-sm text-gray-500">{t('bandOnly')}</p>
          {claimUrl && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-bold text-gray-900">{t('claimTitle')}</h2>
              <p className="mt-1.5 text-sm text-gray-600">{t('claimBody')}</p>
              <div className="mt-4 flex justify-center">
                <QRCodeSVG value={claimUrl} size={150} />
              </div>
              <a href={claimUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-primary-600 sm:hidden">
                {t('openWallet')}
              </a>
            </div>
          )}
          <Link
            href="/matches"
            className="mt-8 inline-block rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {t('seeSupport')}
          </Link>
        </div>
      )}
    </Shell>
  );
}
