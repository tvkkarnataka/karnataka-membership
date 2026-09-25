'use client';

import React, { useState } from 'react';
import { Download, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminIdCardDownload() {
  const [phone, setPhone] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDownloadIdCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const sanitizedPhone = phone.trim().replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!adminSecret) {
      setErrorMessage('Please enter the Admin Secret Key.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/download-id-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ phone: sanitizedPhone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `TVK_ID_Card_${sanitizedPhone}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(downloadUrl);
      setSuccessMessage(`ID Card for ${sanitizedPhone} generated and downloaded successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download ID card.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-6 text-red-600">
          <ShieldCheck size={28} />
          <h1 className="text-xl font-black uppercase tracking-wider">
            Admin ID Card Portal
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleDownloadIdCard} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Member Mobile Number
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit registered number"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Admin Secret Key
            </label>
            <input
              type="password"
              required
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Enter ADMIN_SECRET_KEY"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:bg-slate-400 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating PNG...
              </>
            ) : (
              <>
                <Download size={16} />
                Download Member ID Card (.png)
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}