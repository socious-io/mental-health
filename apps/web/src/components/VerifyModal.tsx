'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

// One verification, two facts (KYC done + over 18), two ways to present it:
// default = the browser wallet at wallet.socious.io (opens in a new tab,
// walks new users through KYC, resumes the connection automatically);
// optional = QR code scanned with the Socious Wallet mobile app.
type Stage = 'verify' | 'verified' | 'error';

export function VerifyModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const t = useTranslations('verify');
  const [stage, setStage] = useState<Stage>('verify');
  const [connectUrl, setConnectUrl] = useState('');
  const [walletUrl, setWalletUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ connect_url?: string; wallet_url?: string; verified?: boolean }>('/credentials/verifications', { method: 'POST' });
        if (cancelled) return;
        if (res.verified) { setStage('verified'); onVerified(); return; }
        setConnectUrl(res.connect_url || '');
        setWalletUrl(res.wallet_url || '');
        timer.current = setInterval(async () => {
          try {
            const check = await api<{ verified: boolean }>('/credentials/verifications');
            if (check.verified) {
              if (timer.current) clearInterval(timer.current);
              setStage('verified');
              onVerified();
            }
          } catch { /* keep polling */ }
        }, 5000);
        setTimeout(() => timer.current && clearInterval(timer.current), 600000);
      } catch {
        setStage('error');
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [open, onVerified]);

  if (!open) return null;
  const demo = connectUrl.startsWith('demo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>

        {stage === 'verify' && (
          <>
            {demo ? (
              <p className="mt-6 text-sm text-mint-700">{t('demoNote')}</p>
            ) : !showQr ? (
              <>
                <p className="mt-2 text-sm text-gray-600">{t('browserBody')}</p>
                {walletUrl ? (
                  <a
                    href={walletUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-block w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white hover:bg-primary-700"
                  >
                    {t('openWallet')}
                  </a>
                ) : (
                  <p className="mt-5 text-sm text-gray-400">…</p>
                )}
                <p className="mt-3 text-xs text-gray-500">{t('browserSteps')}</p>
                <p className="mt-4 text-xs text-gray-500">{t('waiting')}</p>
                <button onClick={() => setShowQr(true)} className="mt-5 text-xs font-semibold text-primary-700 underline">
                  {t('preferApp')}
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-600">{t('oneQrBody')}</p>
                {connectUrl && (
                  <>
                    <div className="mt-5 flex justify-center"><QRCodeSVG value={connectUrl} size={190} /></div>
                    <p className="mt-3 text-xs font-semibold text-primary-700">{t('cameraHint')}</p>
                    <p className="mt-3 text-xs text-gray-500">{t('waiting')}</p>
                  </>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  {t('noWallet')}{' '}
                  <a className="underline" href="https://wallet.socious.io/ios" target="_blank" rel="noreferrer">iOS</a>
                  {' · '}
                  <a className="underline" href="https://wallet.socious.io/android" target="_blank" rel="noreferrer">Android</a>
                </p>
                <button onClick={() => setShowQr(false)} className="mt-4 text-xs font-semibold text-primary-700 underline">
                  {t('preferBrowser')}
                </button>
              </>
            )}
            <div className="mt-5 rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-500">
              {t('kycPrereq')}
            </div>
          </>
        )}

        {stage === 'verified' && (
          <div className="mt-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-2xl text-mint-700">✓</div>
            <p className="mt-3 font-semibold text-gray-900">{t('done')}</p>
          </div>
        )}
        {stage === 'error' && <p className="mt-6 text-sm text-red-600">{t('error')}</p>}

        <button onClick={onClose} className="mt-6 text-sm font-semibold text-gray-500 hover:text-gray-700">{t('close')}</button>
      </div>
    </div>
  );
}
