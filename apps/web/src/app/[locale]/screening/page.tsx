'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Shell } from '@/components/Shell';
import { PHQ9 } from '@/components/PHQ9';
import { CrisisCard } from '@/components/CrisisCard';
import { api, Screening } from '@/lib/api';

type Stage = 'intro' | 'questions' | 'crisis' | 'result';

export default function ScreeningPage() {
  const t = useTranslations('screening');
  const [stage, setStage] = useState<Stage>('intro');
  const [result, setResult] = useState<Screening | null>(null);
  const [claimUrl, setClaimUrl] = useState('');
  const [walletUrl, setWalletUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (stage !== 'result' || !claimUrl || claimed) return;
    const timer = setInterval(async () => {
      try {
        const latest = await api<Screening>('/screenings/latest');
        if (latest.credential_status === 'ISSUED' || latest.credential_status === 'CLAIMED') {
          setClaimed(true);
          clearInterval(timer);
        }
      } catch { /* keep polling */ }
    }, 5000);
    const cap = setTimeout(() => clearInterval(timer), 600000);
    return () => { clearInterval(timer); clearTimeout(cap); };
  }, [stage, claimUrl, claimed]);

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
          onDone={(s, crisis, claim, wallet) => {
            setResult(s);
            setClaimUrl(claim);
            setWalletUrl(wallet);
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
          {claimUrl && claimed && (
            <div className="mt-8 rounded-xl border border-mint-200 bg-mint-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint-100 text-xl text-mint-700">✓</div>
              <h2 className="mt-3 font-bold text-mint-800">{t('attestedTitle')}</h2>
              <p className="mt-1.5 text-sm text-mint-700">{t('attestedBody', { band: t(`band_${result.band}`) })}</p>
            </div>
          )}
          {claimUrl && !claimed && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-bold text-gray-900">{t('claimTitle')}</h2>
              <p className="mt-1.5 text-sm text-gray-600">{t('claimBody')}</p>
              {!showQr ? (
                <>
                  <a
                    href={walletUrl || claimUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white hover:bg-primary-700"
                  >
                    {t('claimOpenBrowser')}
                  </a>
                  <button onClick={() => setShowQr(true)} className="mt-3 block w-full text-xs font-semibold text-primary-700 underline">
                    {t('claimPreferApp')}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-4 flex justify-center">
                    <QRCodeSVG value={claimUrl} size={150} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{t('claimQrHint')}</p>
                  <button onClick={() => setShowQr(false)} className="mt-3 block w-full text-xs font-semibold text-primary-700 underline">
                    {t('claimPreferBrowser')}</button>
                </>
              )}
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
