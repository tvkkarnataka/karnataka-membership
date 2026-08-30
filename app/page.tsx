'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';

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
  const [district, setDistrict] = useState('');
  const [teamName, setTeamName] = useState('');
  const [coordinator, setCoordinator] = useState('');

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
    setDistrict('');
    setTeamName('');
    setCoordinator('');
    setIsRegistered(false);
    setErrorMessage('');
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isEligibleAge(dob)) {
      setErrorMessage('Applicant must be 18 years or older to register.');
      return;
    }

    if (phone.trim().length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName, 
          phone, 
          dob, 
          district,   
          teamName, 
          coordinator 
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && (data.success || data.data || data.member)) {
        setIsRegistered(true);
      } else {
        setErrorMessage(data.error || 'Failed to submit registration. Please try again.');
      }
    } catch {
      setLoading(false);
      setErrorMessage('Network connection error. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        
        {/* Top Flag Stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 flex">
          <div className="w-1/3 bg-[#FF0000]"></div>
          <div className="w-1/3 bg-[#FFFF00]"></div>
          <div className="w-1/3 bg-[#FF0000]"></div>
        </div>

        {/* Top Logo */}
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

        {/* Banner Title */}
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

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORM SECTION */}
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
                pattern="[0-9]{10}" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                placeholder="10-digit mobile number" 
              />
            </div>

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
            </div>

            {/* Team Name and Coordinator */}
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

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#FF0000] hover:bg-[#d90000] text-white font-black py-3.5 rounded-xl transition duration-200 mt-2 shadow-md hover:shadow-lg tracking-wide uppercase disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? 'Submitting Registration...' : 'Register Member (ನೋಂದಾಯಿಸಿ)'}
            </button>
          </form>
        ) : (
          /* SUCCESS VIEW (NO DETAILS TAB, MESSAGE ONLY) */
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
                Your details have been successfully recorded in the TVK Karnataka membership registry.
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