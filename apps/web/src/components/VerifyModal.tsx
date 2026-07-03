'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

// The web-app-v2 pattern: request -> QR/deep-link -> poll every 5s (2 min cap).
export function VerifyModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const t = useTranslations('verify');
  const [connectUrl, setConnectUrl] = useState('');
  const [status, setStatus] = useState<'loading' | 'waiting' | 'verified' | 'error'>('loading');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ connect_url?: string; verified?: boolean }>('/credentials/verifications', { method: 'POST' });
        if (cancelled) return;
        if (res.verified) {
          setStatus('verified');
          onVerified();
          return;
        }
        setConnectUrl(res.connect_url || '');
        setStatus('waiting');
        timer.current = setInterval(async () => {
          try {
            const check = await api<{ verified: boolean }>('/credentials/verifications');
            if (check.verified) {
              if (timer.current) clearInterval(timer.current);
              setStatus('verified');
              onVerified();
            }
          } catch { /* keep polling */ }
        }, 5000);
        setTimeout(() => timer.current && clearInterval(timer.current), 120000);
      } catch {
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [open, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('body')}</p>
        {status === 'waiting' && connectUrl && !connectUrl.startsWith('demo') && (
          <>
            <div className="mt-6 flex justify-center">
              <QRCodeSVG value={connectUrl} size={190} />
            </div>
            <a
              href={connectUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 sm:hidden"
            >
              {t('openWallet')}
            </a>
            <p className="mt-4 text-xs text-gray-500">{t('waiting')}</p>
            <p className="mt-3 text-xs text-gray-400">
              {t('noWallet')}{' '}
              <a className="underline" href="https://wallet.socious.io/ios" target="_blank" rel="noreferrer">iOS</a>
              {' · '}
              <a className="underline" href="https://wallet.socious.io/android" target="_blank" rel="noreferrer">Android</a>
            </p>
          </>
        )}
        {status === 'waiting' && connectUrl.startsWith('demo') && (
          <p className="mt-6 text-sm text-mint-700">{t('demoNote')}</p>
        )}
        {status === 'verified' && (
          <div className="mt-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-2xl text-mint-700">✓</div>
            <p className="mt-3 font-semibold text-gray-900">{t('done')}</p>
          </div>
        )}
        {status === 'error' && <p className="mt-6 text-sm text-red-600">{t('error')}</p>}
        <button onClick={onClose} className="mt-6 text-sm font-semibold text-gray-500 hover:text-gray-700">
          {t('close')}
        </button>
      </div>
    </div>
  );
}
