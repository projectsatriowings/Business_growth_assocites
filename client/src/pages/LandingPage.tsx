import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Globe,
  Layers,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  ChevronRight,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Lock,
  FileText,
  Clock,
  Sparkles,
  Zap,
  Building2,
  PieChart,
  Award,
  Sliders,
  Check,
  X,
  Send,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation anchor handler
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  // Tabbed Service Selection
  const [activeServiceTab, setActiveServiceTab] = useState<'dm' | 'web' | 'mobile' | 'software'>('dm');

  // FAQ Accordion & Category Filter
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<'all' | 'protection' | 'commission' | 'process'>('all');

  // Interactive Earnings Calculator State
  const [dmClients, setDmClients] = useState<number>(4);
  const [dmAvgFee, setDmAvgFee] = useState<number>(35000);
  const [webProjects, setWebProjects] = useState<number>(2);
  const [mobileProjects, setMobileProjects] = useState<number>(1);
  const [erpProjects, setErpProjects] = useState<number>(1);

  // Calculations for Earnings Simulator
  const earnings = useMemo(() => {
    const monthlyDmRecurring = dmClients * (dmAvgFee * 0.15); // 15% monthly recurring
    const webLumpSum = webProjects * (100000 * 0.12); // 12% on ₹1,00,000 avg
    const mobileLumpSum = mobileProjects * (250000 * 0.12); // 12% on ₹2,50,000 avg
    const erpLumpSum = erpProjects * (550000 * 0.10); // 10% on ₹5,50,000 avg
    const totalOneTime = webLumpSum + mobileLumpSum + erpLumpSum;
    const projectedAnnual = (monthlyDmRecurring * 12) + totalOneTime;

    return {
      monthlyDmRecurring,
      webLumpSum,
      mobileLumpSum,
      erpLumpSum,
      totalOneTime,
      projectedAnnual,
    };
  }, [dmClients, dmAvgFee, webProjects, mobileProjects, erpProjects]);

  // Contact form submission
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  // Service Catalog Data
  const services = [
    {
      id: 'dm',
      title: 'Digital Marketing (DM)',
      icon: BarChart3,
      tag: 'Monthly Subscription',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      commission: '15% Monthly Recurring',
      commissionDesc: 'Paid monthly for every verified client invoice',
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      description:
        'End-to-end data-driven marketing campaigns including SEO, Social Media, Google Ads, Meta Ads, and content marketing designed for predictable business customer acquisition.',
      deliverables: [
        'Search Engine Optimization (SEO & Keyword Domination)',
        'Social Media Marketing & Community Management (SMM)',
        'Google Ads Search, Shopping & Performance Max Campaigns',
        'Meta Ads (Facebook & Instagram Lead Generation)',
        'Conversion Rate Optimization & Ad Creative Copywriting',
      ],
      pricingExample: 'Client Retainer: ₹40,000/mo -> BGA Earns ₹6,000 every single month (Recurring!)',
      ruleNotice: 'Note: Advertisement media spend paid to Google/Meta is strictly excluded from commission base.',
      targetAudience: 'Clinics, Law Firms, E-Commerce, Real Estate, Local Businesses, Coaching Institutes',
    },
    {
      id: 'web',
      title: 'High-Performance Web Development',
      icon: Globe,
      tag: 'High Velocity',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      commission: '12% On Final Delivery',
      commissionDesc: 'Lump-sum disbursed on client sign-off & verified payment',
      gradient: 'from-emerald-500 via-teal-600 to-blue-600',
      description:
        'Blazing-fast modern websites and web portals engineered with Next.js, React, and Tailwind CSS. Built for high conversion, 99.9% uptime, and stunning responsive aesthetics.',
      deliverables: [
        'Corporate & Showcase Websites with CMS Integration',
        'Custom E-Commerce Online Stores (Shopify / Next.js / WooCommerce)',
        'High-Converting Product Launch Landing Pages',
        'Website Redesign, Speed Optimization & Core Web Vitals Overhaul',
        'Payment Gateway & CRM Webhook Integrations',
      ],
      pricingExample: 'Project Value: ₹1,20,000 -> BGA Earns ₹14,400 upon project completion & sign-off',
      ruleNotice: 'Full milestone tracking inside portal. Handled directly by Technical Team.',
      targetAudience: 'Corporates, Exporters, Luxury Brands, Direct-to-Consumer (D2C) Brands, Startups',
    },
    {
      id: 'mobile',
      title: 'Mobile Application Development',
      icon: Smartphone,
      tag: 'Enterprise Scalable',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      commission: '12% On Final Delivery',
      commissionDesc: 'Lump-sum disbursed on client sign-off & verified payment',
      gradient: 'from-purple-600 via-pink-600 to-indigo-600',
      description:
        'Native iOS, Android, and cross-platform mobile apps engineered with Flutter, React Native, Kotlin, and Swift with robust cloud backends, offline sync, and real-time push notifications.',
      deliverables: [
        'Native Android App Development (Google Play Store Ready)',
        'Native iOS iPhone & iPad App Development (Apple App Store Ready)',
        'Cross-Platform Hybrid Apps (Flutter / React Native)',
        'Cloud Database Architecture, Authentication & Push Notifications',
        'App Store & Play Store Compliance & Publishing Support',
      ],
      pricingExample: 'Project Value: ₹3,00,000 -> BGA Earns ₹36,000 upon verified delivery',
      ruleNotice: 'Complete architecture design, store review submissions, and warranties handled.',
      targetAudience: 'FinTech, Healthcare Apps, On-Demand Delivery, Booking Engines, Fitness & EdTech',
    },
    {
      id: 'software',
      title: 'Enterprise Cloud & Custom ERP Software',
      icon: Layers,
      tag: 'High Ticket',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      commission: '10% On Final Delivery',
      commissionDesc: 'Lump-sum disbursed on client sign-off & verified payment',
      gradient: 'from-amber-500 via-orange-600 to-red-600',
      description:
        'Custom enterprise cloud software, SaaS applications, custom ERPs, CRMs, inventory managers, and billing engines designed to automate complex corporate workflows.',
      deliverables: [
        'Custom Cloud Enterprise Software & Web Applications',
        'Enterprise Resource Planning (ERP) & Manufacturing Workflows',
        'Multi-Tier Customer Relationship Management (CRM)',
        'Inventory Management, Warehouse Sync & GST E-Way Invoicing',
        'Role-Based Employee Access Control & Audit Trails',
      ],
      pricingExample: 'Project Value: ₹6,00,000 -> BGA Earns ₹60,000 upon project sign-off',
      ruleNotice: 'Dedicated Solution Architect and Technical Lead assigned to every project.',
      targetAudience: 'Manufacturing Units, Wholesalers, Logistics & Supply Chain, Hospitals, Large Agencies',
    },
  ];

  // 6-Stage Workflow Steps
  const workflowSteps = [
    {
      step: '01',
      title: 'Onboarding & KYC Verification',
      department: 'Admin Portal',
      badge: 'BGA Setup',
      desc: 'Submit your profile, PAN, Aadhaar consent, and verified bank payout details. Admin reviews and approves your portal access within 2 business hours.',
    },
    {
      step: '02',
      title: '100% Exclusive Client Registration',
      department: 'BGA Portal',
      badge: 'Permanent Lock',
      desc: 'Register prospective business clients. Our normalized mobile and email verification algorithm permanently locks the client to you. Zero lead poaching.',
    },
    {
      step: '03',
      title: 'Enquiry Scoping & Admin Review',
      department: 'Admin Portal',
      badge: 'Feasibility',
      desc: 'Submit client requirements and discussion notes. Admin reviews commercial feasibility and approves the enquiry for official quotation drafting.',
    },
    {
      step: '04',
      title: 'Official Accounts Quotation',
      department: 'Accounts Portal',
      badge: 'Commercial Proposal',
      desc: 'Specialized Accounts team prepares a branded, GST-compliant commercial quotation with exact scopes and payment terms. Released to BGA after Admin approval.',
    },
    {
      step: '05',
      title: 'Advance Payment & Handover',
      department: 'Accounts & Admin',
      badge: 'Sprint Kickoff',
      desc: 'Client accepts quotation and transfers advance. Accounts verifies bank receipt and Admin authorizes technical handover to sprint execution.',
    },
    {
      step: '06',
      title: 'Sprint Execution & Direct Payout',
      department: 'Technical & Admin',
      badge: 'Bank Credit',
      desc: 'Technical builds the project with transparent milestone tracking. Receive monthly recurring payouts for DM or lump-sum transfers upon project completion.',
    },
  ];

  // FAQ Data with Categories
  const allFaqs = [
    {
      category: 'protection',
      q: 'How does the 100% Exclusive Client Ownership Guarantee work?',
      a: 'When you register a client using their mobile number and email address, our system creates an immutable database record binding that business exclusively to your BGA account. If any other associate attempts to enter the same client, the system automatically blocks the duplicate registration without exposing your identity. You permanently own the client relationship.',
    },
    {
      category: 'process',
      q: 'Do I need any technical coding or IT engineering experience to be a BGA?',
      a: 'None whatsoever! As a Business Growth Associate, your sole responsibility is identifying businesses that need Digital Marketing, Websites, Mobile Apps, or ERP Software and understanding their high-level goals. Our internal Solution Architects, Technical Engineers, and Accounts teams handle technical scoping, proposal drafting, sprint execution, and client demo presentations.',
    },
    {
      category: 'commission',
      q: 'How are commissions calculated for Digital Marketing versus IT Projects?',
      a: 'For Digital Marketing (DM), you earn 15% recurring commission every single month on verified client service fees (ad media spend paid directly to platforms like Google/Meta is strictly excluded from commissionable calculation). For IT Projects (Web, Mobile, Software), you earn 10%–12% lump-sum commission calculated on the agreed service fee, paid immediately upon technical project completion and verified final payment.',
    },
    {
      category: 'commission',
      q: 'When and how are commission payouts disbursed to associates?',
      a: 'All commissions are credited directly to your registered bank account via NEFT/RTGS. For DM clients, commissions are disbursed monthly within 3 business days of verified client invoice realization. For IT projects, payouts occur upon milestone delivery and client sign-off. Every payout generates a downloadable payment voucher with bank reference numbers.',
    },
    {
      category: 'process',
      q: 'Does the BGA prepare official pricing quotations for clients?',
      a: 'No. To ensure legal compliance, accurate GST invoicing, and strict technical feasibility, our professional Accounts Department drafts all commercial quotations. Once Admin approves the quote, it is released to your BGA dashboard as a branded PDF ready to present to your client.',
    },
    {
      category: 'protection',
      q: 'What happens if a client requests revisions to the quotation?',
      a: 'Inside your BGA portal, you can click "Request Revision" with client feedback. The Accounts Department will adjust line items or terms and generate a Version 2 (V2) quote preserving complete version history.',
    },
    {
      category: 'process',
      q: 'What documents are required to activate my BGA account?',
      a: 'You need a valid PAN card (for tax compliance and TDS reporting), masked Aadhaar number for identity verification, and your bank account details (account number, IFSC code, and branch) for commission direct deposits. Admin approves KYC within 2 business hours.',
    },
  ];

  const filteredFaqs = faqCategory === 'all' ? allFaqs : allFaqs.filter((f) => f.category === faqCategory);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col selection:bg-indigo-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Dynamic Light Nav Header */}
      <Navbar />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: CRISP, PREMIUM LIGHT THEME */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/40 via-white to-slate-50 border-b border-slate-200/80">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-indigo-200/40 via-blue-200/30 to-teal-100/40 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-blue-100/60 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-10 -left-40 w-80 h-80 bg-indigo-100/60 blur-3xl rounded-full pointer-events-none" />

        {/* Subtle Geometric Dot Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              
              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-200 text-indigo-700 text-xs font-bold tracking-wide shadow-xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Official Enterprise BGA Partner Network</span>
                <span className="text-slate-300">•</span>
                <span className="text-teal-700 font-extrabold">100% Lead-Lock Active</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] sm:leading-[1.12]">
                Connect Businesses to Technology. <br />
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Earn Predictable, High-Value Wealth.
                </span>
              </h1>

              {/* Compelling Value Sub-Copy */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                You introduce prospective enterprise and SMB clients needing <strong>Digital Marketing, Web, Mobile Apps, or Cloud ERP</strong>. Our dedicated in-house technical engineering and accounts teams handle 100% of the scoping, proposals, and sprint delivery.
              </p>

              {/* Guarantee Highlight Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-xs sm:text-sm text-slate-700 flex items-center gap-3.5 max-w-xl mx-auto lg:mx-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">100% Exclusive Client Ownership Guarantee</strong>
                  <span className="text-slate-500 text-xs">Duplicate prevention algorithm permanently locks every registered client to your ID. Zero lead poaching.</span>
                </div>
              </div>

              {/* CTA Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group"
                >
                  <span>Apply as a Growth Associate</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#calculator"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm sm:text-base shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Simulate Earnings</span>
                </a>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-5 py-4 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Portal Login</span>
                </Link>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Guaranteed Direct Bank NEFT / RTGS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>GST Invoicing Handled by Accounts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Live 10-Stage Pipeline Tracking</span>
                </div>
              </div>

            </div>

            {/* Right Column: Crisp Light Associate Command Hub Mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Glow ring behind card */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-teal-500/20 to-blue-500/20 blur-xl" />

                {/* Light Executive Portal Mockup Container */}
                <div className="relative rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-2xl">
                  
                  {/* Mockup Header Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/25">
                        BGA
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Rahul Verma</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">BGA Partner • ID: #BGA-9421</div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                      ACTIVE PARTNER
                    </span>
                  </div>

                  {/* Mockup Quick KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Monthly Recurring</span>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">₹48,000<span className="text-[10px] text-emerald-600 font-normal">/mo</span></div>
                      <span className="text-[9px] text-emerald-700/80">4 Active DM Retainers</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <span className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider block">Completed Payouts</span>
                      <div className="text-lg font-black text-indigo-700 mt-0.5">₹1,74,000</div>
                      <span className="text-[9px] text-indigo-700/80">Verified Direct Bank NEFT</span>
                    </div>
                  </div>

                  {/* Mockup Active Client Pipeline List */}
                  <div className="space-y-2.5 mb-5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Live Client Portfolio</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        100% Protected
                      </span>
                    </div>

                    {/* Client 1 */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors">
                      <div>
                        <div className="font-bold text-slate-900">CTC Global Logistics</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>Digital Marketing Retainer</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-emerald-600">+₹6,000/mo</span>
                        <div className="text-[9px] text-slate-500 font-medium">15% Recurring Active</div>
                      </div>
                    </div>

                    {/* Client 2 */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors">
                      <div>
                        <div className="font-bold text-slate-900">Artisan Jewels Luxury Store</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span>E-Commerce Web Portal</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-indigo-600">+₹14,400</span>
                        <div className="text-[9px] text-slate-500 font-medium">Final Milestone Sign-off</div>
                      </div>
                    </div>

                    {/* Client 3 */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors">
                      <div>
                        <div className="font-bold text-slate-900">OmniLogistics Cloud ERP</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Enterprise Software</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-amber-600">+₹55,000</span>
                        <div className="text-[9px] text-slate-500 font-medium">Sprint 3 Execution</div>
                      </div>
                    </div>
                  </div>

                  {/* Live Security Shield Tag */}
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Duplicate phone/email check automatically blocks lead stealing.</span>
                  </div>

                </div>

                {/* Floating Notification Pills */}
                <div className="hidden sm:flex absolute -bottom-4 -left-6 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-bold shadow-xl">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xs">
                    ₹
                  </div>
                  <span>₹14,400 Payout Approved Today</span>
                </div>

                <div className="hidden sm:flex absolute -top-4 -right-6 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xl">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quotation Approved in 45m</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LIVE ENTERPRISE METRICS RIBBON (CLEAN WHITE) */}
      {/* ========================================================================= */}
      <section className="relative z-10 border-b border-slate-200 bg-white py-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            
            <div className="pt-4 sm:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                ₹4.8 Cr+
              </div>
              <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">Total Client Pipeline</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Delivered by Technical Team</p>
            </div>

            <div className="pt-4 sm:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                100%
              </div>
              <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Exclusive Client Lock</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Permanent Associate Ownership</p>
            </div>

            <div className="pt-4 sm:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-indigo-600">
                10% - 15%
              </div>
              <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">Guaranteed Commission</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Monthly & Milestone Direct Payouts</p>
            </div>

            <div className="pt-4 sm:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-teal-600">
                24 - 48h
              </div>
              <div className="text-xs text-teal-700 font-bold uppercase tracking-wider mt-1">Official Quote Turnaround</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Prepared by Accounts Department</p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE DIFFERENTIATOR: WHY BGA ENTERPRISE */}
      {/* ========================================================================= */}
      <section className="py-24 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200 inline-block mb-3">
              The Enterprise Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Why Top Growth Associates Partner With Us
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              We have eliminated the friction, technical delivery chaos, and commission disputes that plague traditional agency partnerships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">100% Exclusive Client Lock</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your client relationship is your permanent digital asset. Our database uses strict normalized mobile and email hashing to lock every client exclusively to you. No other associate or internal team member can ever claim or re-register them.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <span>Zero Lead Poaching</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Zero Technical Headaches</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Forget chasing erratic freelancers or dealing with scope creep. Our in-house technical department includes senior software architects, full-stack engineers, and QA leads who handle all sprint executions, deployments, and client demos.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                <span>100% In-House Delivery</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-teal-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Institutional Quotations</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You don’t have to draft complex commercial proposals or pricing models. Our Accounts team generates official, GST-compliant branded quotations with milestone schedules that you can view, download as PDF, and present with pride.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] font-bold text-teal-700 flex items-center gap-1">
                <span>Professional Proposals</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Audited Direct Bank Payouts</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Never chase payments. Commissions are auto-calculated by our backend rules engine and transferred directly to your bank account via NEFT/RTGS with bank reference logs and TDS statements. Every transaction is transparent and immutable.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <span>Verified Direct Payouts</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE ASSOCIATE EARNINGS CALCULATOR (CLEAN LIGHT DESIGN) */}
      {/* ========================================================================= */}
      <section id="calculator" className="py-24 bg-white border-b border-slate-200/80 scroll-mt-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200 inline-block mb-3">
              Transparent Math
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Interactive Associate Earnings Simulator
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Adjust the sliders below to project your monthly recurring and one-time project milestone earnings.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Interactive Controls in Light Cards */}
            <div className="lg:col-span-7 bg-slate-50/80 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
              
              <div className="space-y-5">
                
                {/* Control 1: DM Clients */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold text-sm text-blue-700 block">Digital Marketing Retainers</span>
                      <span className="text-[11px] text-slate-500">15% Monthly Recurring (Ad spend excluded)</span>
                    </div>
                    <span className="text-lg font-black text-blue-700">{dmClients} Clients</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={dmClients}
                    onChange={(e) => setDmClients(parseInt(e.target.value))}
                    className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0 Clients</span>
                    <span>Avg Retainer: ₹35,000/mo</span>
                    <span>15 Clients</span>
                  </div>
                </div>

                {/* Control 2: Web Projects */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold text-sm text-emerald-700 block">Web Development Projects</span>
                      <span className="text-[11px] text-slate-500">12% On Final Delivery (~₹1,00,000 avg)</span>
                    </div>
                    <span className="text-lg font-black text-emerald-700">{webProjects} Projects</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={webProjects}
                    onChange={(e) => setWebProjects(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 bg-slate-200 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0 Projects</span>
                    <span>₹12,000 per project payout</span>
                    <span>10 Projects</span>
                  </div>
                </div>

                {/* Control 3: Mobile Apps */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold text-sm text-purple-700 block">Mobile Application Projects</span>
                      <span className="text-[11px] text-slate-500">12% On Final Delivery (~₹2,50,000 avg)</span>
                    </div>
                    <span className="text-lg font-black text-purple-700">{mobileProjects} Projects</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={mobileProjects}
                    onChange={(e) => setMobileProjects(parseInt(e.target.value))}
                    className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0 Apps</span>
                    <span>₹30,000 per app payout</span>
                    <span>6 Apps</span>
                  </div>
                </div>

                {/* Control 4: Enterprise ERP */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold text-sm text-amber-700 block">Enterprise Software / ERP</span>
                      <span className="text-[11px] text-slate-500">10% On Final Delivery (~₹5,50,000 avg)</span>
                    </div>
                    <span className="text-lg font-black text-amber-700">{erpProjects} Systems</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={erpProjects}
                    onChange={(e) => setErpProjects(parseInt(e.target.value))}
                    className="w-full accent-amber-600 bg-slate-200 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0 ERPs</span>
                    <span>₹55,000 per ERP payout</span>
                    <span>5 ERPs</span>
                  </div>
                </div>

              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All commission rates are configured and audited directly by Company Management.</span>
              </div>

            </div>

            {/* Right: Dynamic Calculation Result Card (Clean Executive Light Theme) */}
            <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 border-2 border-indigo-200/80 text-slate-900 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-3 py-1 rounded-full border border-indigo-300">
                  Projected Income Forecast
                </span>

                {/* Monthly Recurring Box */}
                <div className="mt-6 p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
                  <span className="text-xs text-slate-600 font-bold uppercase block">Monthly Recurring Retainers</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-1">
                    ₹{earnings.monthlyDmRecurring.toLocaleString('en-IN')}
                    <span className="text-sm font-semibold text-slate-500"> / month</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Calculated from {dmClients} active monthly marketing retainers @ 15%
                  </span>
                </div>

                {/* Milestone Payouts Box */}
                <div className="mt-3 p-5 rounded-2xl bg-white border border-indigo-200 shadow-xs">
                  <span className="text-xs text-slate-600 font-bold uppercase block">Milestone Project Payouts</span>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">
                    ₹{earnings.totalOneTime.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                    <div>• Web ({webProjects}x): ₹{earnings.webLumpSum.toLocaleString('en-IN')}</div>
                    <div>• Mobile ({mobileProjects}x): ₹{earnings.mobileLumpSum.toLocaleString('en-IN')}</div>
                    <div>• ERP ({erpProjects}x): ₹{earnings.erpLumpSum.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Grand Annual Total */}
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-md">
                  <span className="text-xs text-emerald-100 font-bold uppercase tracking-wider block">Estimated Year 1 Total Earnings</span>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                    ₹{earnings.projectedAnnual.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-emerald-100/90 mt-1 block">
                    Combined 12 months recurring retainers + milestone project payouts
                  </span>
                </div>

              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <Link
                  to="/register"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Earning With BGA Enterprise</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="text-center mt-3 text-[11px] text-slate-500">
                  Zero signup fees • Official corporate partner agreement provided
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CORE SERVICE CLASSIFICATIONS (LIGHT CARDS) */}
      {/* ========================================================================= */}
      <section id="services" className="py-24 bg-slate-50/70 border-b border-slate-200/80 scroll-mt-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200 inline-block mb-3">
              Standardized Core Offerings
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Four High-Value IT & Marketing Services
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Standardized scopes, institutional pricing, and pre-negotiated associate commission shares.
            </p>

            {/* Desktop Service Selector Pills */}
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-full overflow-x-auto">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setActiveServiceTab(svc.id as any)}
                  className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeServiceTab === svc.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {svc.title.split(' ')[0]} {svc.title.split(' ')[1] || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Active Service Showcase Card */}
          {(() => {
            const current = services.find((s) => s.id === activeServiceTab) || services[0];
            const Icon = current.icon;
            return (
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-10 lg:p-12 shadow-sm relative overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  
                  {/* Left Column */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${current.gradient} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${current.badgeColor}`}>
                          {current.tag}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{current.title}</h3>
                      </div>
                    </div>

                    <div className="inline-block p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">
                      💰 Associate Commission: {current.commission}
                      <span className="block text-xs font-normal text-slate-600 mt-0.5">{current.commissionDesc}</span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {current.description}
                    </p>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Key Technical Scope & Deliverables</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {current.deliverables.map((d, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Pricing Breakdown & Client Avatar */}
                  <div className="lg:col-span-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 p-6 space-y-5">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-indigo-100 pb-3">
                      Commercial Example & Scope
                    </h4>

                    <div className="p-4 rounded-xl bg-white border border-indigo-100 text-xs space-y-2 shadow-xs">
                      <div className="text-indigo-600 font-bold uppercase text-[10px]">Real Payout Example</div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {current.pricingExample}
                      </div>
                      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        {current.ruleNotice}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-indigo-100 text-xs space-y-1.5 shadow-xs">
                      <div className="text-indigo-600 font-bold uppercase text-[10px]">Ideal Target Clients</div>
                      <div className="text-slate-700 font-medium leading-relaxed">
                        {current.targetAudience}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to="/register"
                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm text-center block transition-all shadow-md shadow-indigo-600/25"
                      >
                        Register to Offer This Service →
                      </Link>
                    </div>

                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HOW THE ENTERPRISE WORKFLOW OPERATES (LIGHT 6-STAGE PIPELINE) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 bg-white border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200 inline-block mb-3">
              Flawless Execution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              The 6-Stage Integrated Business Workflow
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Every client moves seamlessly through our 4 integrated departments: BGA, Admin, Accounts, and Technical.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((wf, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 hover:bg-white hover:border-indigo-400 hover:shadow-xl transition-all relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl font-black text-indigo-600/30 group-hover:text-indigo-600 transition-colors font-mono">
                      {wf.step}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-xs">
                      {wf.department}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">{wf.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{wf.desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Stage Milestone</span>
                  <span className="text-teal-700 font-bold">{wf.badge}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. COMPARISON TABLE: GOING SOLO VS PARTNERING WITH BGA ENTERPRISE */}
      {/* ========================================================================= */}
      <section className="py-24 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200 inline-block mb-3">
              The Truth About Agency Selling
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Freelancing Alone vs. BGA Enterprise
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              See why independent consultants scale faster with our enterprise backing.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="grid grid-cols-12 bg-slate-100/90 p-4 sm:p-5 border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-900">
              <div className="col-span-5 sm:col-span-6">Operation Dimension</div>
              <div className="col-span-3 sm:col-span-3 text-red-600 text-center">Going Solo / Freelance</div>
              <div className="col-span-4 sm:col-span-3 text-emerald-700 text-center">BGA Enterprise Network</div>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              
              <div className="grid grid-cols-12 p-4 sm:p-5 items-center">
                <div className="col-span-5 sm:col-span-6 font-semibold text-slate-800">
                  Client Ownership & Protection
                  <span className="block text-[11px] text-slate-500 font-normal">Risk of others pitching your client</span>
                </div>
                <div className="col-span-3 sm:col-span-3 text-center text-red-600 flex items-center justify-center gap-1 font-semibold">
                  <X className="w-4 h-4 shrink-0" /> Zero Protection
                </div>
                <div className="col-span-4 sm:col-span-3 text-center text-emerald-700 flex items-center justify-center gap-1 font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" /> 100% DB Locked
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 sm:p-5 items-center">
                <div className="col-span-5 sm:col-span-6 font-semibold text-slate-800">
                  Technical Project Execution
                  <span className="block text-[11px] text-slate-500 font-normal">Building, coding, debugging</span>
                </div>
                <div className="col-span-3 sm:col-span-3 text-center text-red-600 flex items-center justify-center gap-1 font-semibold">
                  <X className="w-4 h-4 shrink-0" /> Chasing Freelancers
                </div>
                <div className="col-span-4 sm:col-span-3 text-center text-emerald-700 flex items-center justify-center gap-1 font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" /> In-House Tech Team
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 sm:p-5 items-center">
                <div className="col-span-5 sm:col-span-6 font-semibold text-slate-800">
                  Quotation & Proposal Drafting
                  <span className="block text-[11px] text-slate-500 font-normal">Estimates, scopes, commercial contracts</span>
                </div>
                <div className="col-span-3 sm:col-span-3 text-center text-red-600 flex items-center justify-center gap-1 font-semibold">
                  <X className="w-4 h-4 shrink-0" /> Manual Guesswork
                </div>
                <div className="col-span-4 sm:col-span-3 text-center text-emerald-700 flex items-center justify-center gap-1 font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" /> Accounts Team Drafts
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 sm:p-5 items-center">
                <div className="col-span-5 sm:col-span-6 font-semibold text-slate-800">
                  Commission Realization
                  <span className="block text-[11px] text-slate-500 font-normal">Payout reliability and tracking</span>
                </div>
                <div className="col-span-3 sm:col-span-3 text-center text-red-600 flex items-center justify-center gap-1 font-semibold">
                  <X className="w-4 h-4 shrink-0" /> Payment Disputes
                </div>
                <div className="col-span-4 sm:col-span-3 text-center text-emerald-700 flex items-center justify-center gap-1 font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" /> Direct NEFT within 48h
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 sm:p-5 items-center">
                <div className="col-span-5 sm:col-span-6 font-semibold text-slate-800">
                  GST Invoicing & Legal Compliance
                  <span className="block text-[11px] text-slate-500 font-normal">Tax invoices and legal agreements</span>
                </div>
                <div className="col-span-3 sm:col-span-3 text-center text-red-600 flex items-center justify-center gap-1 font-semibold">
                  <X className="w-4 h-4 shrink-0" /> Setup Own Company
                </div>
                <div className="col-span-4 sm:col-span-3 text-center text-emerald-700 flex items-center justify-center gap-1 font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" /> Handled by Enterprise
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CASE STUDIES & PROVEN DELIVERY PORTFOLIO (LIGHT CARDS) */}
      {/* ========================================================================= */}
      <section id="portfolio" className="py-24 bg-white border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200 inline-block mb-3">
              Proven Track Record
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Delivered by Our Technical Department
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Real projects where our associates introduced the business, our engineers delivered, and commissions were paid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Case Study 1 */}
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-blue-300 transition-all group">
              <div>
                <div className="h-44 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-6 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 w-max backdrop-blur-sm">
                    Digital Marketing Retainer
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-white">HealthTech Multi-Specialty Clinic</h4>
                    <span className="text-xs text-blue-100">Patient Lead Generation & SEO</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generated 2,400+ verified doctor consultations in 90 days using Google Search Ads and Meta Lookalike funnels with a 3.8x verified ROAS.
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">3.8x ROAS</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">2,400+ Leads</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Google Ads + SEO</span>
                  </div>
                </div>
              </div>

              <div className="p-4 mx-6 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center">
                <span className="text-slate-700 font-medium">Associate Payout:</span>
                <span className="font-bold text-emerald-800">₹6,750 / Month (Recurring)</span>
              </div>
            </div>

            {/* Case Study 2 */}
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-emerald-300 transition-all group">
              <div>
                <div className="h-44 bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 p-6 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 w-max backdrop-blur-sm">
                    Web Development
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Artisan Jewels Luxury Store</h4>
                    <span className="text-xs text-emerald-100">High-Performance D2C E-Commerce</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Custom Next.js luxury jewelry store featuring a 3D ring customizer, multi-currency checkout via Stripe/Razorpay, and instant ERP order syncing.
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Next.js</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">99.8% Uptime</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Sub-Second Speed</span>
                  </div>
                </div>
              </div>

              <div className="p-4 mx-6 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center">
                <span className="text-slate-700 font-medium">Associate Payout:</span>
                <span className="font-bold text-emerald-800">₹14,400 (Upon Sign-off)</span>
              </div>
            </div>

            {/* Case Study 3 */}
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-purple-300 transition-all group">
              <div>
                <div className="h-44 bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900 p-6 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 w-max backdrop-blur-sm">
                    Custom Cloud ERP
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-white">OmniLogistics Fleet ERP Cloud</h4>
                    <span className="text-xs text-purple-100">Transport & Automated Invoicing</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Multi-depot logistics management software with live GPS fleet telemetry, driver mobile manifests, and automated GST e-way bill generation.
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">React + Node.js</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">PostgreSQL</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">GST APIs</span>
                  </div>
                </div>
              </div>

              <div className="p-4 mx-6 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center">
                <span className="text-slate-700 font-medium">Associate Payout:</span>
                <span className="font-bold text-emerald-800">₹55,000 (Upon Sign-off)</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. INTERACTIVE FAQ ACCORDION WITH CATEGORY TABS (LIGHT) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 bg-slate-50/70 border-b border-slate-200/80 scroll-mt-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200 inline-block mb-3">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Everything You Need to Know
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              Clear answers regarding client protection, commission calculations, and operational workflow.
            </p>

            {/* Filter Pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setFaqCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  faqCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                All Questions
              </button>
              <button
                onClick={() => setFaqCategory('protection')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  faqCategory === 'protection'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Client Protection
              </button>
              <button
                onClick={() => setFaqCategory('commission')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  faqCategory === 'commission'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Commissions & Payouts
              </button>
              <button
                onClick={() => setFaqCategory('process')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  faqCategory === 'process'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Process & Onboarding
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {filteredFaqs.map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full text-left p-5 flex justify-between items-center text-sm sm:text-base font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-indigo-600 transition-transform duration-200 shrink-0 ml-4 ${
                        isOpen ? 'rotate-180 text-teal-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 leading-relaxed bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. PRE-FOOTER HIGH-CONVERSION CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 p-8 sm:p-14 lg:p-16 text-center relative overflow-hidden shadow-2xl text-white">
            
            <div className="relative max-w-3xl mx-auto space-y-6">
              
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 inline-block backdrop-blur-sm">
                Start Today • No Risk
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                Ready to Build an Uncapped Recurring Tech Income?
              </h2>

              <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
                Join our private network of Business Growth Associates. Register your profile in under 3 minutes, get KYC approved, and start locking in high-value clients today.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-sm sm:text-base shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <span>Become a Growth Associate Now</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-7 py-4 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/60 text-white border border-white/20 font-bold text-sm sm:text-base backdrop-blur-md transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-teal-300" />
                  <span>Existing Partner Login</span>
                </Link>
              </div>

              <div className="pt-4 text-xs text-indigo-200 flex flex-wrap justify-center items-center gap-6 font-medium">
                <span>✓ Zero Joining or Membership Fees</span>
                <span>✓ Instant 100% Client Ownership Lock</span>
                <span>✓ Dedicated Engineering Squads</span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. CORPORATE CONTACT & HELP DESK */}
      {/* ========================================================================= */}
      <section id="contact" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Official Help Desk
              </span>
              <h2 className="text-3xl font-extrabold mt-3 text-slate-900">Corporate Headquarters</h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed max-w-md">
                Connect with our partner relationship managers or request a customized presentation for high-ticket software opportunities.
              </p>

              <div className="mt-8 space-y-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Head Office</span>
                    <span className="font-semibold text-slate-800">Level 4, Cyber Gateway, HITEC City, Hyderabad - 500081</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Partner Telephone</span>
                    <span className="font-semibold text-slate-800">+91 98765 43210 / 040-4567890</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Associate Relations Desk</span>
                    <span className="font-semibold text-slate-800">associates@bga-solutions.com</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Form in Clean White Box */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Direct Partner Inquiry</h3>
              <p className="text-xs text-slate-500 mb-6">Our partner relationship desk responds within 2 business hours.</p>

              {contactSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">Inquiry Received Successfully!</div>
                  <p className="text-xs text-slate-600">A Partner Relationship Manager will reach out to your contact details shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Sharma"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Inquiry / Potential Client Type</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Briefly describe your question or prospective client interest..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Inquiry</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. MODERN ENTERPRISE LIGHT FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-slate-50 text-slate-600 py-12 text-xs border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Brand column */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                  BGA
                </div>
                <span className="font-extrabold text-slate-900 text-base">BGA Enterprise</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Centralized Enterprise Growth Partner Network connecting businesses with verified software and marketing solutions with 100% client protection.
              </p>
              <div className="text-[10px] text-slate-500 font-mono">
                System Status: <span className="text-emerald-600 font-bold">OPERATIONAL</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Core Portals</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-indigo-600 transition-colors">BGA Associate Portal</Link></li>
                <li><Link to="/login?role=ADMIN" className="hover:text-indigo-600 transition-colors">Admin Management Portal</Link></li>
                <li><Link to="/login?role=ACCOUNTS" className="hover:text-indigo-600 transition-colors">Accounts & Quotations Portal</Link></li>
                <li><Link to="/login?role=TECHNICAL" className="hover:text-indigo-600 transition-colors">Technical Engineering Portal</Link></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Service Lines</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#services" className="hover:text-indigo-600 transition-colors">Digital Marketing Retainers (15%)</a></li>
                <li><a href="#services" className="hover:text-indigo-600 transition-colors">Custom Web Development (12%)</a></li>
                <li><a href="#services" className="hover:text-indigo-600 transition-colors">Mobile App Development (12%)</a></li>
                <li><a href="#services" className="hover:text-indigo-600 transition-colors">Cloud ERP & Enterprise Software (10%)</a></li>
              </ul>
            </div>

            {/* Legal & Security */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Security & Trust</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /><span className="text-slate-700">100% Client Ownership Guarantee</span></li>
                <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-600" /><span className="text-slate-700">End-to-End SSL 256-bit Encryption</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /><span className="text-slate-700">Government KYC Compliant</span></li>
                <li className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-600" /><span className="text-slate-700">Audited Direct Bank Payouts</span></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 Business Growth Associates Management System (BGA Enterprise). All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <a href="#services" className="hover:text-indigo-600 transition-colors">Services</a>
              <a href="#calculator" className="hover:text-indigo-600 transition-colors">Calculator</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">Workflow</a>
              <Link to="/login" className="hover:text-indigo-600 transition-colors">Portal Login</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
