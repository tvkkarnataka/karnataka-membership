'use client';

import React, { useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Upload 
} from 'lucide-react';

// Dynamic helper function to safely load Supabase client on demand
const getSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ytaqlejhsxjanhmhwmkv.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    alert('Supabase credentials missing! Please check your environment variables.');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
  }

  return createClient(url, key);
};

const KARNATAKA_DISTRICTS = [
  'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'
];

const getMaxAllowedDob = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 18);
  return today.toISOString().split('T')[0];
};

export default function MembershipDrive() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [district, setDistrict] = useState('');
  const [teamName, setTeamName] = useState('');
  const [coordinator, setCoordinator] = useState('');

  // File States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const isEligibleAge = (birthDateString: string): boolean => {
    if (!birthDateString) return false;
    const birthDate = new Date(birthDateString);
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 18);
    return birthDate <= cutoffDate;
  };

  const handleResetForm = () => {
    setFullName('');
    setPhone('');
    setDob('');
    setGender('');
    setDistrict('');
    setTeamName('');
    setCoordinator('');
    setPhotoFile(null);
    setAadharFile(null);
    setPanFile(null);
    setIsRegistered(false);
    setErrorMessage('');
  };

  const uploadFileDirect = async (file: File, folder: string, phoneNum: string): Promise<string> => {
    const supabase = getSupabaseClient();

    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanFileName = `${folder}/${phoneNum}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('member-documents')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload error (${folder}): ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('member-documents')
      .getPublicUrl(cleanFileName);

    return data.publicUrl;
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isEligibleAge(dob)) {
      setErrorMessage('Applicant must be 18 years or older to register.');
      return;
    }

    const sanitizedPhone = phone.trim().replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!gender) {
      setErrorMessage('Please select gender.');
      return;
    }

    if (!photoFile || !aadharFile || !panFile) {
      setErrorMessage('Please upload all 3 required documents (Photo, Aadhaar, and PAN).');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload files directly to Supabase Storage
      const [photoUrl, aadharUrl, panUrl] = await Promise.all([
        uploadFileDirect(photoFile, 'photos', sanitizedPhone),
        uploadFileDirect(aadharFile, 'aadhar', sanitizedPhone),
        uploadFileDirect(panFile, 'pan', sanitizedPhone),
      ]);

      // 2. Save registration record via backend API
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone: sanitizedPhone,
          dob,
          gender,
          district,
          teamName,
          coordinator,
          photoUrl,
          aadharUrl,
          panUrl,
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || `Server returned error status: ${res.status}`);
      }

      setLoading(false);

      if (res.ok && data.success) {
        setIsRegistered(true);
      } else {
        setErrorMessage(data.error || 'Failed to submit registration. Please try again.');
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your connection and try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden my-6">
        
        {/* Header Stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 flex">
          <div className="w-1/3 bg-[#FF0000]"></div>
          <div className="w-1/3 bg-[#FFFF00]"></div>
          <div className="w-1/3 bg-[#FF0000]"></div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mt-3 mb-2">
          <img 
            src="/logo.jpeg" 
            alt="Logo" 
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-20 h-20 object-contain rounded-full border-2 border-red-600 shadow-md bg-white p-1" 
          />
        </div>

        {/* Title Banner */}
        <div className="text-center mb-6">
          <span className="inline-block bg-red-50 text-red-600 text-xs px-3.5 py-1 rounded-full uppercase tracking-wider font-extrabold border border-red-200 mb-2">
            REGISTRATION
          </span>

          <div className="w-full flex justify-center my-1">
            <svg viewBox="0 0 520 70" className="w-full max-w-[420px] h-auto drop-shadow-sm">
              <defs>
                <linearGradient id="tvkEqualSplit" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF0000" />
                  <stop offset="33.33%" stopColor="#FF0000" />
                  <stop offset="33.33%" stopColor="#FFD700" />
                  <stop offset="66.66%" stopColor="#FFD700" />
                  <stop offset="66.66%" stopColor="#FF0000" />
                  <stop offset="100%" stopColor="#FF0000" />
                </linearGradient>
              </defs>
              <text
                x="50%"
                y="52"
                textAnchor="middle"
                fill="url(#tvkEqualSplit)"
                fontSize="42"
                fontWeight="900"
                letterSpacing="2"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                TVK KARNATAKA
              </text>
            </svg>
          </div>

          <p className="text-slate-500 text-xs mt-1 font-medium tracking-wide">
            "Pirappokkum Ellaa Uyirkkum"
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form View */}
        {!isRegistered ? (
          <form onSubmit={handleSubmitRegistration} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Full Name (<span className="text-red-600">ಹೆಸರು</span>)
              </label>
              <input 
                type="text" 
                required 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                placeholder="Enter full name" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Mobile Number (<span className="text-red-600">ಮೊಬೈಲ್ ಸಂಖ್ಯೆ</span>)
              </label>
              <input 
                type="tel" 
                required 
                maxLength={10}
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                placeholder="10-digit mobile number" 
              />
            </div>

            {/* DOB & Gender Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Date of Birth (<span className="text-red-600">ದಿನಾಂಕ</span>)
                </label>
                <input 
                  type="date" 
                  required 
                  value={dob} 
                  max={getMaxAllowedDob()}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Gender (<span className="text-red-600">ಲಿಂಗ</span>)
                </label>
                <select 
                  required 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male (ಪುರುಷ)</option>
                  <option value="Female">Female (ಮಹಿಳೆ)</option>
                  <option value="Other">Other (ಇತರೆ)</option>
                </select>
              </div>
            </div>

            {/* District Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                District (<span className="text-red-600">ಜಿಲ್ಲೆ</span>)
              </label>
              <select 
                required 
                value={district} 
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition"
              >
                <option value="">Select District</option>
                {KARNATAKA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* Team Name & Coordinator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Team Name (<span className="text-red-600">ತಂಡದ ಹೆಸರು</span>)
                </label>
                <input 
                  type="text" 
                  required 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                  placeholder="Team Name" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Coordinator (<span className="text-red-600">ಸಂಯೋಜಕರು</span>)
                </label>
                <input 
                  type="text" 
                  required 
                  value={coordinator} 
                  onChange={(e) => setCoordinator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                  placeholder="Coordinator name" 
                />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload size={14} className="text-red-600" />
                Upload Documents (<span className="text-red-600">ದಾಖಲೆಗಳು</span>)
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  1. Passport Size Photo (ಭಾವಚಿತ್ರ) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="file" 
                  required 
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 bg-slate-50 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  2. Aadhaar Card File / Photo (ಆಧಾರ್) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="file" 
                  required 
                  accept="image/*,application/pdf"
                  onChange={(e) => setAadharFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 bg-slate-50 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  3. PAN Card File / Photo (ಪ್ಯಾನ್ ಕಾರ್ಡ್) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="file" 
                  required 
                  accept="image/*,application/pdf"
                  onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 bg-slate-50 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#FF0000] hover:bg-[#d90000] text-white font-black py-3.5 rounded-xl transition duration-200 mt-2 shadow-md hover:shadow-lg tracking-wide uppercase disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? 'Uploading & Registering...' : 'Register Member (ನೋಂದಾಯಿಸಿ)'}
            </button>
          </form>
        ) : (
          /* Confirmation Screen */
          <div className="py-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-sm">
              <CheckCircle2 size={42} className="text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">
                Registration Successful!
              </h2>
              <p className="text-sm font-semibold text-emerald-700">
                ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ!
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto pt-1">
                Your details and verification documents have been securely uploaded to the TVK Karnataka registry.
              </p>
            </div>

            <div className="pt-4">
              <button 
                type="button"
                onClick={handleResetForm}
                className="w-full bg-[#FF0000] hover:bg-[#d90000] text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
              >
                <RefreshCw size={16} />
                Register Another Member (ಮತ್ತೊಂದು ನೋಂದಣಿ)
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}