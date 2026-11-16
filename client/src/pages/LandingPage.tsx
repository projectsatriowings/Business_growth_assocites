import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedService, setSelectedService] = useState<'dm' | 'web' | 'mobile' | 'software'>('dm');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const services = [
    {
      id: 'dm',
      title: 'Digital Marketing (DM)',
      icon: BarChart3,
      tag: 'Monthly Subscription',
      commission: '15% Monthly Recurring',
      color: 'from-blue-600 to-indigo-600',
      description:
        'End-to-end data-driven marketing campaigns including SEO, Social Media, Google Ads, Meta Ads, and content marketing.',
      items: [
        'Search Engine Optimization (SEO)',
        'Social Media Marketing (SMM)',
        'Google Ads & Search PPC Management',
        'Meta Ads (Facebook & Instagram)',
        'Content Marketing & Brand Copywriting',
      ],
      pricingExample: 'Client Retainer: ₹30,000/mo -> BGA Earns ₹4,500 every month (recurring!)',
      note: 'Note: Advertisement media spend is excluded from commissionable calculation.',
    },
    {
      id: 'web',
      title: 'Website Development',
      icon: Globe,
      tag: 'High Demand',
      commission: '12% On Final Delivery',
      color: 'from-emerald-600 to-teal-600',
      description:
        'Custom high-performance websites built with cutting-edge frameworks, blazing speeds, and modern UX design.',
      items: [
        'Business & Corporate Showcase Websites',
        'Full-scale E-commerce Online Stores',
        'High-Conversion Ad Landing Pages',
        'Website Redesign & Modernization',
      ],
      pricingExample: 'Project Value: ₹1,00,000 -> BGA Earns ₹12,000 upon project sign-off',
      note: 'Disbursed immediately upon technical completion & verified final payment.',
    },
    {
      id: 'mobile',
      title: 'Mobile App Development',
      icon: Smartphone,
      tag: 'Enterprise',
      commission: '12% On Final Delivery',
      color: 'from-purple-600 to-pink-600',
      description:
        'Native and cross-platform mobile apps for iOS and Android built with Flutter, React Native, Kotlin, and Swift.',
      items: [
        'Native Android Applications',
        'Native iOS (iPhone & iPad) Applications',
        'Cross-Platform Hybrid Apps',
        'App Store & Play Store Publishing',
      ],
      pricingExample: 'Project Value: ₹2,50,000 -> BGA Earns ₹30,000',
      note: 'Complete technical architecture and store approvals handled by company.',
    },
    {
      id: 'software',
      title: 'Software Development',
      icon: Layers,
      tag: 'High Ticket',
      commission: '10% On Final Delivery',
      color: 'from-amber-600 to-orange-600',
      description:
        'Enterprise SaaS, ERP, CRM, and cloud billing applications engineered to automate and streamline business workflows.',
      items: [
        'Custom Enterprise Cloud Software',
        'Enterprise Resource Planning (ERP)',
        'Customer Relationship Management (CRM)',
        'Inventory & GST Billing Systems',
      ],
      pricingExample: 'Project Value: ₹5,00,000 -> BGA Earns ₹50,000',
      note: 'Dedicated solution architects and technical leads assigned to every project.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Public Registration & KYC',
      desc: 'Submit your profile, PAN, Aadhaar consent, and bank details. Admin reviews and approves your portal access.',
    },
    {
      step: '02',
      title: 'Register & Own Clients',
      desc: 'Register prospective business clients. Strict normalized mobile/email checks protect your 100% exclusive client ownership.',
    },
    {
      step: '03',
      title: 'Management Enquiry Approval',
      desc: 'Submit client requirements. Admin reviews feasibility and approves the enquiry for official quotation drafting.',
    },
    {
      step: '04',
      title: 'Accounts Official Quotation',
      desc: 'Accounts team prepares a branded quotation with scopes and pricing. You present it to your client with full PDF support.',
    },
    {
      step: '05',
      title: 'Advance Payment Verification',
      desc: 'Client accepts quotation. Accounts verifies bank receipt of the advance, immediately triggering technical project handover.',
    },
    {
      step: '06',
      title: 'Execution & Commission Payout',
      desc: 'Technical builds the project with milestone tracking. Earn monthly commissions for DM or final payout upon completion!',
    },
  ];

  const faqs = [
    {
      q: 'What is a Business Growth Associate (BGA)?',
      a: 'A Business Growth Associate is an independent or agency partner who connects businesses needing digital marketing, web, mobile, or enterprise software services with our engineering team, earning attractive, guaranteed commissions.',
    },
    {
      q: 'How does Client Ownership protection work?',
      a: 'Each client is tied exclusively to the registering BGA. If another associate attempts to register the same mobile or email, our system automatically blocks duplicate creation without revealing the existing associate identity.',
    },
    {
      q: 'Does the BGA prepare official quotations?',
      a: 'No. The BGA requests a quotation, and our specialized Accounts team drafts the verified, branded commercial quotation with accurate GST, advance terms, and technical scopes.',
    },
    {
      q: 'How are commissions calculated for Digital Marketing vs IT Projects?',
      a: 'Digital Marketing offers monthly recurring commissions (e.g. 15%) on verified monthly fees excluding ad spend. Web, Mobile, and Software projects provide lump-sum commissions (e.g. 10-12%) paid out once the project is completed and final payment is verified.',
    },
    {
      q: 'When do I receive portal login credentials?',
      a: 'Immediately after registration your account is in SUBMITTED status. Once our Admin verifies your KYC and bank details, your account is activated and you receive full login access.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-20 pb-28">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-6 uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Official Enterprise Business Growth Partner Network
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Connect Businesses to Technology. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Earn Predictable, High-Value Commissions.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
            A centralized enterprise platform empowering Business Growth Associates with guaranteed client protection, streamlined quotation approvals, and transparent commission payouts.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-base shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Become a Growth Associate</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-base backdrop-blur-sm transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>BGA Portal Login</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 pt-10">
            <div>
              <div className="text-3xl font-extrabold text-white">Enterprise</div>
              <div className="text-xs text-slate-400 font-medium uppercase mt-1">Growth Associate Network</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 font-medium uppercase mt-1">Exclusive Client Ownership</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-indigo-400">10% - 15%</div>
              <div className="text-xs text-slate-400 font-medium uppercase mt-1">Service Commission Rates</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-teal-400">End-to-End</div>
              <div className="text-xs text-slate-400 font-medium uppercase mt-1">Quotation to Handover</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Classification Section */}
      <section id="services" className="py-20 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Core Offerings
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Four Core Service Classifications</h2>
            <p className="text-slate-600 text-sm mt-2">
              High-value technology and growth solutions with standardized pricing and commission structures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${svc.color} flex items-center justify-center text-white shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {svc.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{svc.title}</h3>
                    <div className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold mt-2 border border-emerald-200">
                      💰 {svc.commission}
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">{svc.description}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Key Modules</div>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {svc.items.map((it, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                    <p className="text-[11px] font-semibold text-slate-800">{svc.pricingExample}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{svc.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Transparent Operations
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">How the System Works</h2>
            <p className="text-slate-600 text-sm mt-2">
              From associate onboarding and client registration to official quotations and commission disbursement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workflowSteps.map((wf, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 relative group hover:border-indigo-400 transition-colors">
                <div className="text-3xl font-extrabold text-indigo-600/30 group-hover:text-indigo-600/60 transition-colors">
                  {wf.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{wf.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{wf.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Model & Benefits */}
      <section id="earning" className="py-20 bg-slate-900 text-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-900/50 px-3 py-1 rounded-full border border-teal-700/50">
                Transparent Revenue Sharing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-4 leading-tight">
                Clear, Rule-Based Commission Engine Configured by Admin
              </h2>
              <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                Never guess your earnings. Our backend enforces mathematical commission rules and tracks eligibility status:
              </p>

              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-300">Digital Marketing Model</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      Monthly Recurring
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">
                    Commission calculated separately for each verified monthly client payment. <strong className="text-white">Advertisement spend is strictly excluded</strong> from the commissionable amount.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-300">Web, Mobile & Software Model</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Project Milestone Completion
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">
                    Lump-sum commission calculated on the agreed service scope fee. Commission becomes eligible <strong className="text-white">strictly after technical project sign-off AND verified final payment</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-300">Audited Payouts</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Direct Bank Transfer
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">
                    Admin reviews and approves all disbursements. Payout records include bank transaction references and immutable audit logs.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Associate Earnings Simulator</h3>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-700">
                  <span className="text-slate-400">1x Custom ERP Software (₹5,00,000 @ 10%)</span>
                  <span className="font-bold text-emerald-400 text-sm">₹50,000</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-700">
                  <span className="text-slate-400">2x Mobile Applications (₹3,00,000 @ 12%)</span>
                  <span className="font-bold text-emerald-400 text-sm">₹36,000</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-700">
                  <span className="text-slate-400">3x Business Websites (₹1,50,000 @ 12%)</span>
                  <span className="font-bold text-emerald-400 text-sm">₹18,000</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-700">
                  <span className="text-slate-400">4x Active DM Clients (₹1,20,000 fee @ 15% /mo)</span>
                  <span className="font-bold text-indigo-400 text-sm">₹18,000 / month</span>
                </div>

                <div className="pt-4 flex justify-between items-center text-sm font-bold bg-slate-900/60 p-4 rounded-xl mt-4">
                  <span>Simulated Total Earnings:</span>
                  <span className="text-teal-300 text-lg">₹1,22,000 + ₹18k/mo</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="block text-center py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all"
                >
                  Register to Start Earning Today
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Showcase */}
      <section id="portfolio" className="py-20 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Proven Track Record
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Company Portfolio & Case Studies</h2>
            <p className="text-slate-600 text-sm mt-2">
              Deliverables engineered by our Technical Department across diverse global industries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="h-44 bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white p-6">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-90" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Digital Marketing</span>
                  <h4 className="text-lg font-bold">HealthTech Lead Acceleration</h4>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generated 2,400+ qualified patient leads within 90 days using Google Search Ads and Meta Lookalike campaigns with 3.8x ROAS.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">SEO</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">Google Ads</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">ROAS 3.8x</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="h-44 bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white p-6">
                <div className="text-center">
                  <Globe className="w-10 h-10 mx-auto mb-2 opacity-90" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Web Development</span>
                  <h4 className="text-lg font-bold">Artisan Jewels E-Commerce</h4>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Luxury jewelry direct-to-consumer store with custom ring customizer, multi-currency checkout, and instant ERP order syncing.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">Next.js</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">Stripe / Razorpay</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">99.8% Uptime</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="h-44 bg-gradient-to-tr from-purple-600 to-indigo-800 flex items-center justify-center text-white p-6">
                <div className="text-center">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-90" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Custom Software</span>
                  <h4 className="text-lg font-bold">OmniLogistics ERP Cloud</h4>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cloud ERP for fleet management, real-time GPS tracking, electronic proof of delivery, and automated GST e-way bills.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">React</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">PostgreSQL</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">REST APIs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Answers to Common Inquiries</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left p-4 sm:p-5 flex justify-between items-center font-bold text-slate-800 hover:bg-slate-50 transition-colors text-sm"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === i ? 'rotate-90 text-indigo-600' : ''}`}
                  />
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-900 text-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Get In Touch</span>
              <h2 className="text-3xl font-extrabold mt-2">Corporate Headquarters</h2>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                Connect with our partnership support desk or schedule a presentation walkthrough with our business team.
              </p>

              <div className="mt-8 space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Head Office</span>
                    <span className="font-semibold text-slate-200">Level 4, Cyber Gateway, HITEC City, Hyderabad - 500081</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Direct Support</span>
                    <span className="font-semibold text-slate-200">+91 98765 43210 / 040-4567890</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Associate Desk Email</span>
                    <span className="font-semibold text-slate-200">associates@bga-solutions.com</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 p-6 sm:p-8 rounded-2xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-2">Send an Enquiry to Operations</h3>
              <p className="text-xs text-slate-400 mb-6">Our partner relationship managers respond within 2 business hours.</p>

              <form onSubmit={(e) => { e.preventDefault(); alert('Thank you! Your message has been received.'); }} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email / Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="email@domain.com or 10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe your inquiry..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                >
                  Submit Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-8 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Business Growth Associates Management System. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#services" className="hover:text-slate-300">Services</a>
            <a href="#how-it-works" className="hover:text-slate-300">How It Works</a>
            <a href="#earning" className="hover:text-slate-300">Commission Model</a>
            <Link to="/login" className="hover:text-slate-300">BGA Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

