import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  CreditCard,
  Building2,
  FileText,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  AlertTriangle,
  Copy,
  Check,
  X,
  History,
  FileCheck,
  KeyRound,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

export const BgaProfileView: React.FC = () => {
  const { user: authUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active section tab within profile
  const [profileTab, setProfileTab] = useState<
    'personal' | 'identity' | 'bank' | 'documents' | 'account' | 'agreements' | 'history'
  >('personal');

  // Security Toggles
  const [revealBankAcc, setRevealBankAcc] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Modals
  const [editPersonalModal, setEditPersonalModal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    houseNumber: '',
    streetAddress: '',
    locality: '',
    district: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  // Bank Account Modal
  const [bankModal, setBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankAccountHolder: '',
    bankName: '',
    bankAccountNumber: '',
    confirmAccountNumber: '',
    bankIfsc: '',
    branchName: '',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Identity Correction Modal
  const [correctionModal, setCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    correctionType: 'PAN' as 'PAN' | 'AADHAAR' | 'NAME' | 'DOB',
    proposedValue: '',
    reason: '',
    documentUrl: '',
  });
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; type: string } | null>(null);

  // Document Upload Modal
  const [uploadDocModal, setUploadDocModal] = useState<'ADDRESS_PROOF' | 'BANK_PROOF' | null>(null);
  const [uploadDocUrl, setUploadDocUrl] = useState('');
  const [uploadDocName, setUploadDocName] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/bga/profile');
      setProfileData(data);
      if (data.addressDetails) {
        setPersonalForm({
          houseNumber: data.addressDetails.houseNumber || '',
          streetAddress: data.addressDetails.streetAddress || '',
          locality: data.addressDetails.locality || '',
          district: data.addressDetails.district || '',
          city: data.addressDetails.city || '',
          state: data.addressDetails.state || '',
          pinCode: data.addressDetails.pinCode || '',
          country: data.addressDetails.country || 'India',
        });
      }
      if (data.user) {
        setBankForm({
          bankAccountHolder: data.user.bankAccountHolder || '',
          bankName: data.user.bankName || '',
          bankAccountNumber: data.user.bankAccountNumber || '',
          confirmAccountNumber: data.user.bankAccountNumber || '',
          bankIfsc: data.user.bankIfsc || '',
          branchName: '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load associate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const maskAccount = (acc: string | null) => {
    if (!acc) return 'Not Provided';
    if (revealBankAcc) return acc;
    if (acc.length <= 4) return acc;
    return '••••••••' + acc.slice(-4);
  };

  const maskPan = (pan: string | null) => {
    if (!pan) return 'Not Provided';
    if (pan.length <= 4) return pan;
    return pan.slice(0, 2) + '••••••' + pan.slice(-2);
  };

  const openEditPersonalModal = () => {
    const address = profileData?.addressDetails;
    const currentUser = profileData?.user;
    setPersonalForm({
      houseNumber: address?.houseNumber || '',
      streetAddress: address?.streetAddress || '',
      locality: address?.locality || '',
      district: address?.district || '',
      city: address?.city || currentUser?.city || '',
      state: address?.state || currentUser?.state || '',
      pinCode: address?.pinCode || currentUser?.pinCode || '',
      country: address?.country || 'India',
    });
    setPersonalError(null);
    setEditPersonalModal(true);
  };

  const openBankModal = () => {
    const currentUser = profileData?.user;
    if (currentUser) {
      setBankForm({
        bankAccountHolder: currentUser.bankAccountHolder || '',
        bankName: currentUser.bankName || '',
        bankAccountNumber: currentUser.bankAccountNumber || '',
        confirmAccountNumber: currentUser.bankAccountNumber || '',
        bankIfsc: currentUser.bankIfsc || '',
        branchName: '',
      });
    }
    setBankError(null);
    setBankModal(true);
  };

  const openCorrectionModal = () => {
    setCorrectionForm({
      correctionType: 'PAN',
      proposedValue: '',
      reason: '',
      documentUrl: '',
    });
    setCorrectionError(null);
    setCorrectionModal(true);
  };

  // 1. Save Personal Details & Address
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError(null);
    setSavingPersonal(true);

    try {
      if (personalForm.pinCode && !/^\d{6}$/.test(personalForm.pinCode.trim())) {
        throw new Error('PIN Code must be a 6-digit number');
      }

      const res = await apiRequest('/api/bga/profile', {
        method: 'PUT',
        body: JSON.stringify(personalForm),
      });

      setSuccess(res.message || 'Personal details updated successfully');
      setEditPersonalModal(false);
      await fetchProfile();
      if (refreshUser) {
        refreshUser();
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setPersonalError(err.message || 'Failed to update personal details');
    } finally {
      setSavingPersonal(false);
    }
  };

  // 2. Save / Replace Bank Account
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setSavingBank(true);

    try {
      if (bankForm.bankAccountNumber !== bankForm.confirmAccountNumber) {
        throw new Error('Account numbers do not match');
      }

      const cleanIfsc = bankForm.bankIfsc.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        throw new Error('Invalid IFSC code format (e.g. HDFC0001234)');
      }

      const res = await apiRequest('/api/bga/bank-account', {
        method: 'POST',
        body: JSON.stringify(bankForm),
      });

      setSuccess(res.message || 'Bank account updated and queued for Admin verification');
      setBankModal(false);
      await fetchProfile();
      if (refreshUser) {
        refreshUser();
      }
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setBankError(err.message || 'Failed to update bank details');
    } finally {
      setSavingBank(false);
    }
  };

  // 3. Submit Identity Correction Request
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionError(null);
    setSavingCorrection(true);

    try {
      const res = await apiRequest('/api/bga/identity-correction', {
        method: 'POST',
        body: JSON.stringify(correctionForm),
      });

      setSuccess(res.message || 'Identity correction request submitted to Admin for review');
      setCorrectionModal(false);
      setCorrectionForm({
        correctionType: 'PAN',
        proposedValue: '',
        reason: '',
        documentUrl: '',
      });
      await fetchProfile();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to submit correction request');
    } finally {
      setSavingCorrection(false);
    }
  };

  // 4. Upload Compliance Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocModal || !uploadDocUrl) return;
    setSavingDoc(true);

    try {
      const res = await apiRequest('/api/bga/documents', {
        method: 'POST',
        body: JSON.stringify({
          documentType: uploadDocModal,
          fileUrl: uploadDocUrl,
          fileName: uploadDocName || 'Uploaded Document',
        }),
      });

      setSuccess(res.message || 'Document updated successfully');
      toast.success(res.message || 'Document updated successfully');
      setUploadDocModal(null);
      setUploadDocUrl('');
      setUploadDocName('');
      await fetchProfile();
      if (refreshUser) {
        refreshUser();
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update document');
    } finally {
      setSavingDoc(false);
    }
  };

  if (loading && !profileData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-[#119DA4] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading your comprehensive profile & verification records...</p>
      </div>
    );
  }

  const user = profileData?.user || authUser;
  const addressDetails = profileData?.addressDetails || {};
  const bankHistory = profileData?.bankHistory || [];
  const identityCorrections = profileData?.identityCorrections || [];
  const changeHistory = profileData?.changeHistory || [];

  return (
    <div className="w-full space-y-6">
      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#119DA4] text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#119DA4] shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-[#119DA4] hover:text-[#119DA4]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-[#3066BE]/20 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BA'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3066BE]/10 text-[#3066BE] border border-[#3066BE]/20 uppercase tracking-wider">
                  {user?.role || 'BGA'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  {user?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  ID: {user?.id}
                  <button
                    onClick={() => copyToClipboard(user?.id)}
                    className="p-1 hover:text-indigo-600 transition-colors"
                    title="Copy Associate ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-[#119DA4]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span>•</span>
                <span>Registered: {new Date(user?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <button
              onClick={openEditPersonalModal}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Personal Details</span>
            </button>
            <button
              onClick={openBankModal}
              className="px-3.5 py-2 rounded-xl bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Update Bank Account</span>
            </button>
          </div>
        </div>

        {/* Verification Status Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">PAN Verification</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">{maskPan(user?.panNumber)}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                user?.panVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {user?.panVerified ? 'Verified ✓' : 'Pending Verification'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Aadhaar Status</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                {user?.aadhaarNumber && user.aadhaarNumber.replace(/\D/g, '').length === 12
                  ? `${user.aadhaarNumber.replace(/\D/g, '').slice(0, 4)} ${user.aadhaarNumber.replace(/\D/g, '').slice(4, 8)} ${user.aadhaarNumber.replace(/\D/g, '').slice(8, 12)}`
                  : (user?.aadhaarMasked || 'XXXX-XXXX-XXXX')}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                user?.aadhaarVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {user?.aadhaarVerified ? 'Verified ✓' : 'Submitted'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Bank Account</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                {user?.bankName || 'Bank'} ({maskAccount(user?.bankAccountNumber)})
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                user?.bankVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {user?.bankVerified ? 'Verified ✓' : 'Verification Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto text-xs font-semibold text-slate-600 bg-white p-2 rounded-xl shadow-sm">
        <button
          onClick={() => setProfileTab('personal')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'personal' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>1. Personal & Contact</span>
        </button>
        <button
          onClick={() => setProfileTab('identity')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'identity' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2. Identity & KYC</span>
        </button>
        <button
          onClick={() => setProfileTab('bank')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'bank' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>3. Bank Accounts</span>
        </button>
        <button
          onClick={() => setProfileTab('documents')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'documents' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>4. Documents & Proofs</span>
        </button>
        <button
          onClick={() => setProfileTab('account')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'account' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>5. Account & Security</span>
        </button>
        <button
          onClick={() => setProfileTab('agreements')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'agreements' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>6. Agreements & Consent</span>
        </button>
        <button
          onClick={() => setProfileTab('history')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            profileTab === 'history' ? 'bg-[#3066BE] text-white shadow-sm shadow-[#3066BE]/20 font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>7. Change History</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL & CONTACT INFORMATION */}
      {profileTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Personal & Residential Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Submitted during associate registration. Address details can be updated as needed.
              </p>
            </div>
            <button
              onClick={openEditPersonalModal}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-indigo-600" />
              <span>Edit Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Legal Name
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.name}</p>
              <span className="text-[10px] text-slate-400">Locked to identity verification</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {user?.dob ? new Date(user.dob).toLocaleDateString() : 'Not Specified'}
              </p>
              <span className="text-[10px] text-slate-400">Locked to identity records</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Registered Email Address
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.email}</p>
              <span className="text-[10px] text-[#119DA4] font-semibold">Primary Login & Notification Channel</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Registered Mobile Phone
              </span>
              <p className="font-bold text-slate-900 text-sm">+91 {user?.mobile}</p>
              <span className="text-[10px] text-[#119DA4] font-semibold">Verified Phone Number</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> House / Building No.
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {addressDetails?.houseNumber || 'Not specified'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Street Address / Road
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {addressDetails?.streetAddress || 'Not specified'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Area / Locality
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {addressDetails?.locality || 'Not specified'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> City
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.city || addressDetails?.city || 'Not specified'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> District
              </span>
              <p className="font-bold text-slate-900 text-sm">{addressDetails?.district || 'Not specified'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> State
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.state || addressDetails?.state || 'Not specified'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> PIN Code
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.pinCode || addressDetails?.pinCode || 'Not specified'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Country
              </span>
              <p className="font-bold text-slate-900 text-sm">{addressDetails?.country || 'India'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-slate-900 font-bold mb-0.5">Complete Residential Address on File:</strong>
              <p className="text-slate-600 leading-relaxed">
                {addressDetails?.fullAddress || user?.address || 'No address provided during registration'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTITY & KYC INFORMATION */}
      {profileTab === 'identity' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Identity & KYC Verification Records</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory identity verification required for tax deductions (TDS) and legal associate onboarding.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAN Card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    PAN
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Permanent Account Number (PAN)</span>
                    <span className="text-[10px] text-slate-400">Income Tax Department of India</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user?.panVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user?.panVerified ? 'Verified ✓' : 'Pending Verification'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">PAN Number:</span>
                <span className="font-mono font-bold text-sm text-slate-900 tracking-wider">
                  {maskPan(user?.panNumber)}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Verification Date:</span>
                  <span className="font-medium text-slate-700">
                    {user?.panVerifiedAt ? new Date(user.panVerifiedAt).toLocaleDateString() : 'Verified on Approval'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TDS Compliance:</span>
                  <span className="font-semibold text-[#119DA4]">Eligible for 5% Associate TDS</span>
                </div>
              </div>
            </div>

            {/* Aadhaar Card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    UID
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Aadhaar Identification</span>
                    <span className="text-[10px] text-slate-400">Unique Identification Authority of India (UIDAI)</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user?.aadhaarVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user?.aadhaarVerified ? 'Verified ✓' : 'Consent Recorded'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">Aadhaar Number:</span>
                <span className="font-mono font-bold text-sm text-slate-900 tracking-wider">
                  {user?.aadhaarNumber && user.aadhaarNumber.replace(/\D/g, '').length === 12
                    ? `${user.aadhaarNumber.replace(/\D/g, '').slice(0, 4)} ${user.aadhaarNumber.replace(/\D/g, '').slice(4, 8)} ${user.aadhaarNumber.replace(/\D/g, '').slice(8, 12)}`
                    : (user?.aadhaarMasked || 'XXXX-XXXX-XXXX')}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Privacy Compliance:</span>
                  <span className="font-medium text-[#119DA4]">12-digit UIDAI registered</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification Status:</span>
                  <span className="font-medium text-slate-700">
                    {user?.aadhaarVerifiedAt ? new Date(user.aadhaarVerifiedAt).toLocaleDateString() : 'Completed with Consent'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Strict Identity Lock Notice:</strong>
              <p className="text-[11px] text-amber-700 mt-0.5">
                For legal compliance and fraud prevention, verified PAN and Aadhaar records cannot be directly edited by associates. Please contact Company Administration for any official record updates.
              </p>
            </div>
          </div>

          {/* Pending / Historical Identity Correction Requests */}
          {identityCorrections.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Identity Correction Requests Submitted to Admin
              </h3>
              <div className="space-y-2">
                {identityCorrections.map((corr: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{corr.correctionType} Correction</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            corr.status === 'APPROVED'
                              ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]'
                              : corr.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {corr.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Current: <strong>{corr.currentValue}</strong> → Proposed: <strong className="text-indigo-600">{corr.proposedValue}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Reason: {corr.reason}</p>
                      {corr.adminRemarks && (
                        <p className="text-[10px] text-purple-700 font-medium mt-1">Admin Remarks: {corr.adminRemarks}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(corr.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANK ACCOUNTS */}
      {profileTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Direct Commission Disbursement Bank Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Commissions from verified monthly retainers and project handovers are disbursed directly to this account.
              </p>
            </div>
            <button
              onClick={openBankModal}
              className="px-3.5 py-2 rounded-xl bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Update / Replace Bank Account</span>
            </button>
          </div>

          {/* Primary Bank Card */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#119DA4] text-[#119DA4] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {user?.bankName || 'Direct Disbursement Bank Account'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Primary Payout Destination
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    user?.bankVerified ? 'bg-teal-50 text-[#119DA4] text-[#119DA4] border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {user?.bankVerified ? 'Verified for Payouts ✓' : 'Verification Pending ⚠️'}
                </span>
                <button
                  onClick={() => setRevealBankAcc(!revealBankAcc)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                  title={revealBankAcc ? 'Mask Account Number' : 'Reveal Account Number'}
                >
                  {revealBankAcc ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
              <div>
                <span className="text-slate-500 block font-medium">Account Holder Name:</span>
                <strong className="text-slate-900 font-bold block mt-0.5">{user?.bankAccountHolder || 'Not Specified'}</strong>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Account Number:</span>
                <strong className="text-slate-900 font-mono font-bold block mt-0.5 tracking-wider">
                  {maskAccount(user?.bankAccountNumber)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">IFSC Code:</span>
                <strong className="text-slate-900 font-mono font-bold block mt-0.5 uppercase">
                  {user?.bankIfsc || 'Not Specified'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Verification Date:</span>
                <strong className="text-slate-900 font-bold block mt-0.5">
                  {user?.bankVerifiedAt ? new Date(user.bankVerifiedAt).toLocaleDateString() : user?.bankVerified ? 'Verified on Approval' : 'Pending Verification'}
                </strong>
              </div>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Commission Payout Security Rule:</strong>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Our automated disbursement engine transfers commissions strictly to verified accounts. If you replace your bank account, its status is marked as PENDING_VERIFICATION. Payouts are temporarily held until Company Admin verifies your updated bank details.
              </p>
            </div>
          </div>

          {/* Previous Bank Accounts in History */}
          {bankHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Previous Bank Accounts (Archived History)
              </h3>
              <div className="space-y-2">
                {bankHistory.map((bh: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{bh.bankName}</span>
                        <span className="font-mono text-slate-600">({bh.bankAccountNumberMasked})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          Replaced
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Holder: {bh.bankAccountHolder} • IFSC: {bh.bankIfsc}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Replaced: {new Date(bh.replacedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOCUMENTS & PROOFS */}
      {profileTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Submitted Compliance Documents & Agreements</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access-controlled statutory proofs submitted during registration and verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAN Proof */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">PAN Card Document Proof</span>
                <span className="text-slate-500 text-[11px] block">Statutory Tax Identification Document</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-block">
                  {user?.panVerified ? 'Verified Document' : 'Submitted'}
                </span>
              </div>
              <button
                onClick={() =>
                  setPreviewDoc({
                    title: 'PAN Card Document Proof',
                    url: user?.panDocumentUrl || '/sample-pan.pdf',
                    type: 'PDF',
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-indigo-600 font-semibold text-xs flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>

            {/* Address Proof */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Residential Address Proof</span>
                <span className="text-slate-500 text-[11px] block">Aadhaar / Utility Bill / Passport</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 inline-block">
                  Verified Record
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPreviewDoc({
                      title: 'Residential Address Proof',
                      url: user?.addressProofUrl || '/sample-address.pdf',
                      type: 'PDF',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-indigo-600 font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => setUploadDocModal('ADDRESS_PROOF')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600"
                  title="Upload Updated Address Proof"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bank Proof */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Bank Proof (Cancelled Cheque / Passbook)</span>
                <span className="text-slate-500 text-[11px] block">
                  {user?.bankName || 'Bank'} ({maskAccount(user?.bankAccountNumber)})
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                  user?.bankVerified ? 'bg-emerald-50 text-[#119DA4] border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {user?.bankVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPreviewDoc({
                      title: 'Bank Proof Document (Cancelled Cheque)',
                      url: user?.bankProofUrl || '/sample-bank.pdf',
                      type: 'PDF',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-indigo-600 font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => setUploadDocModal('BANK_PROOF')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600"
                  title="Upload Updated Bank Proof"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACCOUNT & SECURITY */}
      {profileTab === 'account' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Account Governance, Security & Lifecycle</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only system identifiers, verification audit timestamps, and security governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Associate Unique ID</span>
              <p className="font-mono font-bold text-slate-900">{user?.id}</p>
              <span className="text-[10px] text-slate-400">Primary Database Reference</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Login & Identity Email</span>
              <p className="font-bold text-slate-900">{user?.email}</p>
              <span className="text-[10px] text-slate-400">Verified identity handle</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">System Role & Access</span>
              <p className="font-bold text-[#119DA4]">{user?.role || 'BGA'} — Associate</p>
              <span className="text-[10px] text-slate-400">Role-Based Access Control</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Registration Date</span>
              <p className="font-bold text-slate-900">{new Date(user?.createdAt).toLocaleDateString()}</p>
              <span className="text-[10px] text-slate-400">Initial application submission</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Activation & Approval Date</span>
              <p className="font-bold text-slate-900">
                {user?.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : 'Approved on Setup'}
              </p>
              <span className="text-[10px] text-slate-400">Admin verified access</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Last Profile Update</span>
              <p className="font-bold text-slate-900">{new Date(user?.updatedAt).toLocaleString()}</p>
              <span className="text-[10px] text-slate-400">Database synchronization timestamp</span>
            </div>
          </div>

          {/* Account Security & Password Management */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3066BE]" />
                <h3 className="text-sm font-bold text-slate-900">Account Credentials & Security</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                Update your login password securely. Changes apply instantly across the Growth Associate portal and company systems.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3066BE] hover:bg-[#25549e] text-white text-xs font-bold shadow-md shadow-[#3066BE]/20 transition-all shrink-0 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* TAB 6: AGREEMENTS & CONSENT */}
      {profileTab === 'agreements' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Associate Agreements & Statutory Consent</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Legal agreements executed during public registration and compliance onboarding.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#119DA4] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold mb-0.5">
                  Business Growth Associate Agreement: ACCEPTED
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  You accepted the associate commission revenue-share model, non-disclosure terms, and independent contractor guidelines on{' '}
                  <strong className="text-slate-900">
                    {user?.agreementAcceptedAt ? new Date(user.agreementAcceptedAt).toLocaleString() : 'Registration'}
                  </strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#119DA4] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold mb-0.5">
                  Exclusive Client Ownership Guarantee: ACTIVE
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Under section 4 of the enterprise agreement, prospective clients registered with verified unique mobile and email remain 100% tied to you. No other associate may claim or register duplicate leads.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#119DA4] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold mb-0.5">
                  Identity Verification Consent (Aadhaar & PAN): GIVEN
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Consent given for electronic identity validation and tax reporting in compliance with company onboarding norms.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CHANGE HISTORY AUDIT LOG */}
      {profileTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Profile & Bank Account Audit History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable change log showing all personal detail updates, bank account replacements, and identity correction requests.
            </p>
          </div>

          {changeHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No profile changes recorded yet. Initial registration details remain current.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-3">Field / Event</th>
                    <th className="p-3">Previous Value</th>
                    <th className="p-3">New Value</th>
                    <th className="p-3">Requested Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeHistory.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{item.field}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">{item.oldValue}</td>
                      <td className="p-3 text-[#119DA4] font-mono text-[11px] font-semibold max-w-xs truncate">{item.newValue}</td>
                      <td className="p-3 text-slate-500">{new Date(item.requestedAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'APPROVED' || item.status === 'COMPLETED'
                              ? 'bg-teal-50 text-[#119DA4] text-[#119DA4]'
                              : item.status === 'PENDING_VERIFICATION' || item.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{item.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EDIT PERSONAL & ADDRESS DETAILS */}
      {editPersonalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Residential Address & Contact</h3>
                <p className="text-xs text-slate-500">Update your current residential and postal address.</p>
              </div>
              <button onClick={() => setEditPersonalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {personalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{personalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePersonal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">House / Building No.</label>
                  <input
                    type="text"
                    value={personalForm.houseNumber}
                    onChange={(e) => setPersonalForm({ ...personalForm, houseNumber: e.target.value })}
                    placeholder="e.g. Flat 402, Sai Residency"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={personalForm.streetAddress}
                    onChange={(e) => setPersonalForm({ ...personalForm, streetAddress: e.target.value })}
                    placeholder="e.g. Road No. 12, Banjara Hills"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={personalForm.locality}
                    onChange={(e) => setPersonalForm({ ...personalForm, locality: e.target.value })}
                    placeholder="e.g. Near HDFC Bank"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={personalForm.city}
                    onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                    placeholder="e.g. Hyderabad"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={personalForm.district}
                    onChange={(e) => setPersonalForm({ ...personalForm, district: e.target.value })}
                    placeholder="e.g. Hyderabad"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={personalForm.state}
                    onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
                    placeholder="e.g. Telangana"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={personalForm.pinCode}
                    onChange={(e) => setPersonalForm({ ...personalForm, pinCode: e.target.value })}
                    placeholder="e.g. 500081"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditPersonalModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPersonal}
                  className="px-5 py-2 rounded-lg bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm font-bold disabled:opacity-50"
                >
                  {savingPersonal ? 'Saving...' : 'Save Address Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE / REPLACE BANK ACCOUNT */}
      {bankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update / Replace Bank Account</h3>
                <p className="text-xs text-slate-500">Provide verified bank account details for commission payouts.</p>
              </div>
              <button onClick={() => setBankModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Verification Hold Warning:</strong>
                <span className="text-[11px] text-amber-700">
                  Submitting new bank details will reset bank verification to <strong>PENDING_VERIFICATION</strong>. Your previous verified account will be archived in history. Commission payouts will resume once Company Admin approves your new account.
                </span>
              </div>
            </div>

            {bankError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBank} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Holder Full Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankAccountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, bankAccountHolder: e.target.value })}
                  placeholder="As per bank passbook / cheque"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="password"
                    required
                    value={bankForm.bankAccountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                    placeholder="Enter account number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankForm.confirmAccountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                    placeholder="Re-enter account number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={bankForm.bankIfsc}
                    onChange={(e) => setBankForm({ ...bankForm, bankIfsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Name (Optional)</label>
                  <input
                    type="text"
                    value={bankForm.branchName}
                    onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                    placeholder="e.g. Cyber City Branch"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBankModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="px-5 py-2 rounded-lg bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm font-bold disabled:opacity-50"
                >
                  {savingBank ? 'Submitting Bank Details...' : 'Submit for Admin Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DOCUMENT PREVIEW */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.title}</h3>
                <p className="text-xs text-slate-400">Authenticated statutory document viewer</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200 min-h-[220px] flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-indigo-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">{previewDoc.title}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Document securely stored in enterprise encrypted vault. Document reference: <span className="font-mono">{previewDoc.url}</span>
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open / Download Document
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DOCUMENT REPLACEMENT UPLOAD */}
      {uploadDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update {uploadDocModal.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-slate-500">Upload replacement or refreshed compliance proof</p>
              </div>
              <button onClick={() => setUploadDocModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Display Name</label>
                <input
                  type="text"
                  required
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Updated Passbook 2026, Electricity Bill"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document File URL / Cloud Reference</label>
                <input
                  type="text"
                  required
                  value={uploadDocUrl}
                  onChange={(e) => setUploadDocUrl(e.target.value)}
                  placeholder="e.g. /uploads/documents/proof-2026.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadDocModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-5 py-2 rounded-lg bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm font-bold disabled:opacity-50"
                >
                  {savingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
