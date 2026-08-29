'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  UserCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  Download, 
  Users, 
  UserCog, 
  Award 
} from 'lucide-react';
import jsPDF from 'jspdf';

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

interface MemberData {
  membershipId: string;
  fullName: string;
  phone: string;
  dob: string;
  district: string;
  vmiExperience: number;
  teamName: string;
  coordinator: string;
}

export default function MembershipDrive() {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [district, setDistrict] = useState('');
  const [vmiExperience, setVmiExperience] = useState('');
  const [teamName, setTeamName] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [registeredMember, setRegisteredMember] = useState<MemberData | null>(null);

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
    setVmiExperience('');
    setTeamName('');
    setCoordinator('');
    setRegisteredMember(null);
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
          vmiExperience: Number(vmiExperience) || 0,
          teamName, 
          coordinator 
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        setRegisteredMember(data.member);
      } else {
        setErrorMessage(data.error || `Server error (${res.status})`);
      }
    } catch (err) {
      setLoading(false);
      console.error('Fetch error:', err);
      setErrorMessage('Network connection error. Check server logs.');
    }
  };

  const handleDownloadPDF = () => {
    if (!registeredMember) return;
    setDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85, 155]
      });

      // Background & Border
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(3, 3, 79, 149, 4, 4, 'F');
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.roundedRect(3, 3, 79, 149, 4, 4, 'D');

      // Top Tri-Color Flag Stripe
      doc.setFillColor(220, 38, 38);
      doc.rect(4, 4, 25.5, 4, 'F');
      doc.setFillColor(250, 204, 21);
      doc.rect(29.5, 4, 25.5, 4, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(55, 4, 26, 4, 'F');

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text('TVK KARNATAKA REGISTRATION DRIVE', 42.5, 14, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text('MEMBER ID CARD', 42.5, 20, { align: 'center' });

      // ID Badge
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(12, 23, 61, 9, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(220, 38, 38);
      doc.text(registeredMember.membershipId, 42.5, 29, { align: 'center' });

      // Divider Line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.line(8, 35, 77, 35);

      // Card Fields
      let currentY = 41;

      const renderField = (label: string, value: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        doc.text(label.toUpperCase(), 10, currentY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(17, 24, 39);
        doc.text(value, 10, currentY + 4);

        currentY += 11.5;
      };

      renderField('Full Name', registeredMember.fullName);
      renderField('Mobile Number', `+91 ${registeredMember.phone}`);
      renderField('Date of Birth', registeredMember.dob);
      renderField('District', registeredMember.district);
      renderField('VMI Experience', `${registeredMember.vmiExperience} Year(s)`);
      renderField('Team Name', registeredMember.teamName);
      renderField('Coordinator', registeredMember.coordinator);

      // Footer
      doc.setDrawColor(243, 244, 246);
      doc.line(8, 137, 77, 137);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.text('Official Membership Registry', 10, 143);
      doc.text(new Date().toLocaleDateString('en-IN'), 75, 143, { align: 'right' });

      doc.save(`${registeredMember.membershipId}_Membership_Card.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setDownloading(false);
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
        {!registeredMember ? (
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

            {/* VMI Experience */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                VMI Exp (Years) (<span className="text-red-600">ಅನುಭವ</span>)
              </label>
              <input 
                type="number" 
                required 
                min="0"
                max="50"
                value={vmiExperience} 
                onChange={(e) => setVmiExperience(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition" 
                placeholder="0, 1, 2..." 
              />
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
              className="w-full bg-[#FF0000] hover:bg-[#d90000] text-white font-black py-3.5 rounded-xl transition duration-200 mt-2 shadow-md hover:shadow-lg tracking-wide uppercase"
            >
              {loading ? 'Submitting Registration...' : 'Register Member (ನೋಂದಾಯಿಸಿ)'}
            </button>
          </form>
        ) : (
          /* SUCCESS VIEW & ID CARD */
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold border border-emerald-200 mb-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Registered Successfully
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Membership Card Ready</h2>
              <p className="text-xs text-slate-500">Download your official membership card below.</p>
            </div>

            {/* Visual Card on Screen */}
            <div className="bg-white border-2 border-red-500 rounded-2xl p-5 shadow-sm space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-red-600 tracking-wider uppercase block">Karnataka Drive</span>
                  <span className="text-xs font-extrabold text-slate-900">MEMBER ID CARD</span>
                </div>
                <span className="text-sm font-mono font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {registeredMember.membershipId}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs">
                  <UserCheck size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      Full Name (<span className="text-red-600">ಹೆಸರು</span>)
                    </span>
                    <strong className="text-slate-900 font-bold">{registeredMember.fullName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Phone size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      Mobile Number (<span className="text-red-600">ಮೊಬೈಲ್ ಸಂಖ್ಯೆ</span>)
                    </span>
                    <span className="text-slate-800 font-medium">+91 {registeredMember.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Calendar size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      Date of Birth (<span className="text-red-600">ದಿನಾಂಕ</span>)
                    </span>
                    <span className="text-slate-800 font-medium">{registeredMember.dob}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <MapPin size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      District (<span className="text-red-600">ಜಿಲ್ಲೆ</span>)
                    </span>
                    <span className="text-slate-800 font-medium">{registeredMember.district}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Award size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      VMI Experience (<span className="text-red-600">ಅನುಭವ</span>)
                    </span>
                    <span className="text-slate-800 font-medium">{registeredMember.vmiExperience} Year(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Users size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      Team Name (<span className="text-red-600">ತಂಡದ ಹೆಸರು</span>)
                    </span>
                    <span className="text-slate-800 font-medium">{registeredMember.teamName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <UserCog size={15} className="text-red-600 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">
                      Coordinator (<span className="text-red-600">ಸಂಯೋಜಕರು</span>)
                    </span>
                    <span className="text-slate-800 font-medium">{registeredMember.coordinator}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Download PDF & Register Another */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="w-full bg-[#FF0000] hover:bg-[#d90000] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 text-sm"
              >
                <Download size={16} />
                {downloading ? 'Generating PDF...' : 'Download Member ID Card (PDF)'}
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs border border-slate-300"
              >
                <RefreshCw size={14} /> Register Another Member (ಮತ್ತೊಂದು ನೋಂದಣಿ)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}