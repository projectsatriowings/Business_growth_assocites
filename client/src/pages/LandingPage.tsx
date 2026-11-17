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
  Zap,
  Award,
  Building,
  Check,
  ExternalLink,
  Palette,
  Edit3,
  Video,
  Compass,
  MessageSquare,
  Send,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [portfolioTab, setPortfolioTab] = useState<'all' | 'web' | 'specialized' | 'campaign'>('all');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactSubject, setContactSubject] = useState('Inquiry about Growth Associate Programme');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

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

  // Handle Contact Form Submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(null);
    setContactError(null);
    setContactLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          companyName: contactCompany,
          subject: contactSubject,
          message: contactMessage,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setContactError(data.error || 'Failed to send inquiry. Please try again or reach out directly.');
      } else {
        setContactSuccess(data.message || 'Thank you! Your message has been sent successfully.');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactCompany('');
        setContactMessage('');
      }
    } catch (err: any) {
      setContactError('Unable to connect to server. Please try again or contact us directly at info@atriowings.in');
    } finally {
      setContactLoading(false);
    }
  };

  // Four Main BGA Service Categories (Preserving existing commission rules)
  const bgaServices = [
    {
      id: 'dm',
      title: 'Digital Marketing',
      subtitle: 'Monthly Retainer Subscription',
      icon: BarChart3,
      tag: 'Monthly Subscription',
      tagColor: 'bg-[#AEECEF]/40 text-[#119DA4] border-[#80DED9]/50',
      commission: '15% Monthly Recurring',
      color: 'from-[#3066BE] to-[#119DA4]',
      description:
        'Data-driven campaigns including Search Engine Optimization, Social Media Marketing, Google Ads, Meta Ads, and content marketing.',
      items: [
        'Search Engine Optimization (SEO)',
        'Social Media Marketing (SMM & Brand Awareness)',
        'Google Ads & Search PPC Management',
        'Meta Ads (Facebook & Instagram Campaigns)',
        'Content Marketing & Brand Copywriting',
      ],
      pricingExample: 'Client Retainer: ₹30,000/mo → BGA Earns ₹4,500 every month (recurring!)',
      note: 'Note: Advertisement media spend is strictly excluded from commissionable calculation.',
    },
    {
      id: 'web',
      title: 'Website Development',
      subtitle: 'Milestone & Project Based',
      icon: Globe,
      tag: 'High Demand',
      tagColor: 'bg-[#edf4fc] text-[#3066BE] border-[#6D96C5]/30',
      commission: '12% On Final Delivery',
      color: 'from-[#119DA4] to-[#80DED9]',
      description:
        'Custom high-performance websites built with modern frameworks, blazing speeds, mobile responsiveness, and modern UX design.',
      items: [
        'Corporate & Business Showcase Websites',
        'Full-scale E-Commerce Online Stores',
        'High-Conversion Campaign Landing Pages',
        'Website Redesign, Maintenance & Modernization',
      ],
      pricingExample: 'Project Value: ₹1,00,000 → BGA Earns ₹12,000 upon project sign-off',
      note: 'Disbursed immediately upon technical completion & verified final payment.',
    },
    {
      id: 'mobile',
      title: 'Mobile App Development',
      subtitle: 'iOS & Android Engineering',
      icon: Smartphone,
      tag: 'Enterprise',
      tagColor: 'bg-[#e7f7f8] text-[#119DA4] border-[#80DED9]/60',
      commission: '12% On Final Delivery',
      color: 'from-[#3066BE] to-[#6D96C5]',
      description:
        'Native and cross-platform mobile applications for iOS and Android engineered with Flutter, React Native, Kotlin, and Swift.',
      items: [
        'Native Android Applications',
        'Native iOS (iPhone & iPad) Applications',
        'Cross-Platform Hybrid Mobile Apps (Flutter/React Native)',
        'App Store & Google Play Store Publishing & Optimization',
      ],
      pricingExample: 'Project Value: ₹2,50,000 → BGA Earns ₹30,000',
      note: 'Complete technical architecture and store approvals handled by company.',
    },
    {
      id: 'software',
      title: 'Software Development',
      subtitle: 'Custom Cloud & ERP Solutions',
      icon: Layers,
      tag: 'High Ticket',
      tagColor: 'bg-[#edf4fc] text-[#3066BE] border-[#3066BE]/30',
      commission: '10% On Final Delivery',
      color: 'from-[#152544] to-[#3066BE]',
      description:
        'Custom business software, ERP, CRM, inventory, and cloud billing applications engineered to automate business workflows.',
      items: [
        'Custom Enterprise Cloud Software & SaaS',
        'Enterprise Resource Planning (ERP Systems)',
        'Customer Relationship Management (CRM)',
        'Inventory, Invoicing & GST Billing Systems',
      ],
      pricingExample: 'Project Value: ₹5,00,000 → BGA Earns ₹50,000',
      note: 'Dedicated solution architects and technical leads assigned to every project.',
    },
  ];

  // Atriowings Additional Capabilities
  const supportingCapabilities = [
    {
      title: 'Product Design',
      desc: 'Intuitive user interface (UI) and user experience (UX) design, wireframing, and interactive design prototypes.',
      icon: Palette,
    },
    {
      title: 'Content Writing',
      desc: 'Professional SEO copywriting, blog writing, website content, and brand messaging tailored for search engines.',
      icon: Edit3,
    },
    {
      title: 'Video Ads & Editing',
      desc: 'Commercial video production, promotional reels, product demos, motion graphics, and creative brand storytelling.',
      icon: Video,
    },
    {
      title: 'Consultation & Strategy',
      desc: 'In-depth digital transformation, tech stack consultation, market analysis, and growth acceleration guidance.',
      icon: Compass,
    },
  ];

  // 9-Step Associate Journey
  const journeySteps = [
    {
      step: '01',
      title: 'Register as Growth Associate',
      desc: 'Submit your profile, credentials, and basic details through our fast online onboarding portal.',
    },
    {
      step: '02',
      title: 'Complete Identity & Bank KYC',
      desc: 'Provide PAN, Aadhaar consent, and bank details for transparent verification and direct bank payouts.',
    },
    {
      step: '03',
      title: 'Company Approval & Activation',
      desc: 'Administration reviews your documentation and activates full access to your personalized associate workspace.',
    },
    {
      step: '04',
      title: 'Discover Potential Clients',
      desc: 'Identify local businesses, retailers, startups, and organizations seeking digital transformation.',
    },
    {
      step: '05',
      title: 'Register Clients & Submit Enquiries',
      desc: 'Lock in 100% exclusive client ownership. Our system automatically blocks duplicate mobile and email registrations.',
    },
    {
      step: '06',
      title: 'Request Official Quotations',
      desc: 'Submit client requirements. Our dedicated Accounts department drafts a formal, branded Atriowings quotation.',
    },
    {
      step: '07',
      title: 'Present Quotation to Client',
      desc: 'Share verified commercial terms, scope breakdown, and payment milestones with complete professional PDF support.',
    },
    {
      step: '08',
      title: 'Convert to Live Projects',
      desc: 'Upon client advance payment verification, Atriowings technical teams execute end-to-end design, code, and deployment.',
    },
    {
      step: '09',
      title: 'Earn Guaranteed Commissions',
      desc: 'Receive recurring monthly payouts for Digital Marketing or lump-sum completion fees directly into your bank account.',
    },
  ];

  // Verified Client Logos from atriowings.in
  const clientLogos = [
    { name: 'Sai', file: '/img/vendor/sai.webp' },
    { name: 'Dhara', file: '/img/vendor/dhara.webp' },
    { name: 'Divine', file: '/img/vendor/divine.webp' },
    { name: 'Mithra', file: '/img/vendor/mithra.webp' },
    { name: 'M Cars', file: '/img/vendor/mcars.webp' },
    { name: 'Miniso', file: '/img/vendor/miniso-poster-logo.webp' },
    { name: 'PRS', file: '/img/vendor/prs-logo.webp' },
    { name: 'Sivaji Sons', file: '/img/vendor/sivajisons.webp' },
    { name: 'Joyson Trust', file: '/img/vendor/joysontrust.webp' },
    { name: 'Space Media', file: '/img/vendor/spacemedia.webp' },
    { name: 'Meera Filings', file: '/img/vendor/meera-filngs.webp' },
    { name: 'Studio J', file: '/img/vendor/studioj.webp' },
    { name: 'Vasanth', file: '/img/vendor/vasanth.webp' },
    { name: 'VR Tech', file: '/img/vendor/vrtech.webp' },
    { name: 'MK', file: '/img/vendor/mk.webp' },
    { name: 'Scissors Properties', file: '/img/vendor/sissers.webp' },
    { name: 'Blessence', file: '/img/vendor/blessence.webp' },
  ];

  // Verified Projects from atriowings.in/portfolio
  const portfolioProjects = [
    {
      title: 'Universal Engineering',
      type: 'web',
      category: 'Corporate Web Development',
      image: '/img/portfolio/universal-engineering.webp',
      description: 'Corporate engineering enterprise website highlighting industrial capabilities and technical services.',
    },
    {
      title: 'Scissors Properties',
      type: 'specialized',
      category: 'Real Estate Platform',
      image: '/img/portfolio/scissors-properties.webp',
      description: 'Property showcasing and customer inquiry platform built for streamlined real-estate buyer engagement.',
    },
    {
      title: 'PRS Dental Care',
      type: 'web',
      category: 'Healthcare Digital Platform',
      image: '/img/portfolio/prs-dental.webp',
      description: 'Responsive healthcare website showcasing multi-speciality clinical services and patient appointment booking.',
    },
    {
      title: 'GJS Hospitals',
      type: 'web',
      category: 'Hospital Digital Portal',
      image: '/img/portfolio/gjs-hospitals.webp',
      description: 'Modern medical institution website highlighting medical departments, doctors, and emergency consultation channels.',
    },
    {
      title: 'Sivaji Sons',
      type: 'specialized',
      category: 'Travel & Transport Solutions',
      image: '/img/portfolio/sivaji-sons.webp',
      description: 'Corporate portal for travel and transportation services with fleet details and direct booking contact flows.',
    },
    {
      title: 'Ghurudev Platform',
      type: 'specialized',
      category: 'Educational Platform',
      image: '/img/portfolio/ghurudev.webp',
      description: 'Educational and institutional web solution designed for student outreach and program information.',
    },
    {
      title: 'Miniso Campaign',
      type: 'campaign',
      category: 'Brand Marketing Showcase',
      image: '/img/portfolio/miniso.webp',
      description: 'Commercial digital marketing and promotional campaign asset production for brand retail presence.',
    },
    {
      title: 'Yakobu Business Solutions',
      type: 'web',
      category: 'Corporate IT Platform',
      image: '/img/portfolio/yakobu.webp',
      description: 'Enterprise business services website with corporate portfolio presentation and service inquiry workflow.',
    },
    {
      title: 'Blessence Brand',
      type: 'campaign',
      category: 'Lifestyle & E-Commerce',
      image: '/img/portfolio/blessence.webp',
      description: 'Product presentation and brand marketing showcase crafted for consumer engagement and lifestyle outreach.',
    },
  ];

  const filteredProjects = portfolioProjects.filter((p) => {
    if (portfolioTab === 'all') return true;
    return p.type === portfolioTab;
  });

  // Growth Associate Benefits
  const associateBenefits = [
    {
      title: 'Zero Capital Investment',
      desc: 'Becoming a Business Growth Associate is 100% free of charge. Start earning high-ticket commissions with zero upfront financial risk.',
      icon: Zap,
    },
    {
      title: 'Exclusive Client Protection',
      desc: 'Your registered clients are locked strictly to your account. Our automated system permanently prevents duplicate registrations and internal conflict.',
      icon: ShieldCheck,
    },
    {
      title: 'Complete Technical Execution',
      desc: 'You focus on client discovery. Atriowings Technologies handles all technical scoping, design, development, quality assurance, and deployment.',
      icon: Layers,
    },
    {
      title: 'Dedicated Quotation Desk',
      desc: 'Our specialized Accounts department generates formal, branded PDF commercial quotations with transparent milestones and GST compliance.',
      icon: FileText,
    },
    {
      title: 'Real-Time Tracking Portal',
      desc: 'Access your dedicated associate dashboard to monitor enquiries, review quotation statuses, follow project milestones, and track payments.',
      icon: TrendingUp,
    },
    {
      title: 'Audited Direct Bank Payouts',
      desc: 'Transparent payouts transferred via NEFT/IMPS with clear transaction reference numbers, tax compliance, and immutable audit logs.',
      icon: DollarSign,
    },
  ];

  // Frequently Asked Questions
  const faqs = [
    {
      q: 'What is the relationship between Atriowings Technologies and BGA Enterprise?',
      a: 'Atriowings Technologies is the parent IT solutions company that delivers the actual engineering, development, and digital marketing services to clients. BGA Enterprise is the official Business Growth Associates Management System where independent growth partners register clients, request quotations, track live projects, and earn verified commissions.',
    },
    {
      q: 'How does exclusive client ownership work in BGA Enterprise?',
      a: 'Whenever you register a new client in your associate portal, our system checks mobile numbers and email addresses. If the client is unique, they are locked exclusively to your profile. If another associate attempts to register the same client, the system blocks the duplicate, guaranteeing that all future enquiries and commissions belong to you.',
    },
    {
      q: 'Does the Growth Associate prepare official quotations or technical scopes?',
      a: 'No. You only need to collect and submit the client’s high-level business requirements. Atriowings Technologies has a dedicated Accounts and Technical department that evaluates the requirements, prepares the professional commercial quotation, and sets milestone pricing.',
    },
    {
      q: 'How are commissions calculated for Digital Marketing versus IT Projects?',
      a: 'For Digital Marketing subscriptions, Associates receive a 15% recurring monthly commission on the verified retainer fee (excluding media ad spend). For Website, Mobile, and Software projects, Associates earn 10% to 12% milestone commissions disbursed promptly upon technical handover and verified final payment.',
    },
    {
      q: 'When do I receive my BGA portal login credentials?',
      a: 'Immediately after submitting your registration, your account is created in SUBMITTED status. Once the Atriowings Administration verifies your identity KYC and bank details, your account is activated and you can log in to your associate dashboard.',
    },
    {
      q: 'Are there any upfront fees, registration costs, or hidden charges?',
      a: 'No. Becoming a Business Growth Associate is completely free. Atriowings Technologies believes in transparent, mutually profitable partnerships where your income is directly tied to the client value generated.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 selection:bg-[#80DED9]/30 selection:text-[#152544]">
      {/* 1. HEADER AND NAVIGATION */}
      <Navbar />

      {/* 2. HERO – GROW YOUR BUSINESS WITH ATRIOWINGS */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#152544] via-[#1a365d] to-[#0f172a] text-white pt-20 pb-28 sm:pt-28 sm:pb-36">
        {/* Subtle Architectural Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3066BE15_1px,transparent_1px),linear-gradient(to_bottom,#119DA415_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,#000_70%,transparent_100%)] opacity-70" />

        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-[#3066BE]/25 to-[#119DA4]/25 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-[#80DED9]/15 blur-[90px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Dual Identity Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#119DA4]/20 border border-[#80DED9]/40 text-[#80DED9] text-xs font-bold mb-8 uppercase tracking-wider backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#80DED9]" />
            <span>Atriowings Technologies • BGA Enterprise Network</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] sm:leading-[1.12]">
            Grow Your Business with Atriowings. <br />
            <span className="bg-gradient-to-r from-[#AEECEF] via-[#80DED9] to-[#119DA4] bg-clip-text text-transparent">
              Earn Verified, High-Value Commissions.
            </span>
          </h1>

          {/* Subheading with Clear Dual Relationship */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            <strong className="text-white font-semibold">Atriowings Technologies</strong> provides industry-leading digital and IT solutions. Through <strong className="text-white font-semibold">BGA Enterprise</strong>, Growth Associates register exclusive clients, coordinate quotations and projects, and earn guaranteed commercial commissions.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white font-bold text-base shadow-lg shadow-[#3066BE]/30 hover:shadow-xl hover:shadow-[#119DA4]/30 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Become a Growth Associate</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="#about"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-base backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 hover:border-[#80DED9]/50"
            >
              <span>Explore Atriowings Solutions</span>
              <ChevronRight className="w-4 h-4 text-[#80DED9]" />
            </a>
          </div>

          {/* Verified Quick Metrics Bar */}
          <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 pt-10 text-center">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">6+ Years</div>
              <div className="text-xs text-[#AEECEF] font-semibold uppercase tracking-wider mt-1">Industry IT Experience</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#80DED9]">100%</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Exclusive Client Ownership</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#6D96C5]">10% – 15%</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Verified Commission Rates</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#119DA4]">End-to-End</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Quotation to Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT ATRIOWINGS TECHNOLOGIES */}
      <section id="about" className="py-24 bg-white scroll-mt-20 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3066BE] bg-[#edf4fc] px-3.5 py-1.5 rounded-full border border-[#6D96C5]/30">
                About the Company
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
                Driving Digital Transformation with Six Years of Proven Excellence
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
                <strong className="text-slate-900 font-semibold">Atriowings Technologies</strong> is a leading IT solutions company based in Chennai, delivering professional web development, digital marketing, product design, and multimedia services.
              </p>
              <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                We are dedicated, passionate technology providers offering industry best practices synchronized with technology expertise and business domain knowledge. We believe in mutual wins by creating world-class digital solutions that help clients scale and thrive.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-[#3066BE]/10 text-[#3066BE] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Expert Technical Team</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Experienced engineers delivering on time at competitive rates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-[#119DA4]/10 text-[#119DA4] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Business Domain Expertise</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Deep understanding of enterprise challenges and digital ROI.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <a
                  href="https://atriowings.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#3066BE] hover:text-[#119DA4] transition-colors"
                >
                  <span>Visit Official Parent Company Website (atriowings.in)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-gradient-to-tr from-[#152544] to-[#1a365d] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-[#6D96C5]/30">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#119DA4]/20 blur-3xl pointer-events-none rounded-full" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 text-[#80DED9]">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Corporate Headquarters</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Headquartered in Chennai, India, Atriowings Technologies operates enterprise client delivery with structured departments for Technical Execution, Accounts & Quotations, and Partner Support.
                </p>

                <div className="mt-6 pt-6 border-t border-slate-700/80 space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#80DED9] shrink-0 mt-0.5" />
                    <span>No. 1, Gurudev Complex, 57th St, Venkatraman Nagar, Korattur, Chennai - 600080</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#80DED9] shrink-0" />
                    <a href="tel:+918825948859" className="hover:text-white transition-colors">
                      +91 8825948859
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#80DED9] shrink-0" />
                    <a href="mailto:info@atriowings.in" className="hover:text-white transition-colors">
                      info@atriowings.in
                    </a>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700/80">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#AEECEF] block mb-1">
                    Operated Enterprise Platform
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    BGA Enterprise Management System
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OUR CORE SERVICES & SUPPORTING CAPABILITIES */}
      <section id="services" className="py-24 bg-[#f8fafc] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#119DA4] bg-[#e7f7f8] px-3.5 py-1.5 rounded-full border border-[#80DED9]/40">
              Company Capabilities & Offerings
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Four Core BGA Technology Classifications
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Standardized, high-impact digital solutions delivered by Atriowings Technologies with clear, pre-configured commission rules for Growth Associates.
            </p>
          </div>

          {/* Four Core Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {bgaServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.id}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group hover:border-[#3066BE]/50"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${svc.color} flex items-center justify-center text-white shadow-md shadow-[#3066BE]/20 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${svc.tagColor}`}>
                        {svc.tag}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#3066BE] transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{svc.subtitle}</p>

                    <div className="inline-block px-3 py-1 rounded-lg bg-[#e7f7f8] text-[#119DA4] text-xs font-bold mt-3 border border-[#80DED9]/40">
                      💰 {svc.commission}
                    </div>

                    <p className="text-xs text-slate-600 mt-3.5 leading-relaxed">
                      {svc.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Deliverable Scopes
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {svc.items.map((it, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#119DA4] shrink-0" />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 bg-[#edf4fc]/50 -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 p-4 sm:p-5 rounded-b-2xl border-t border-[#6D96C5]/20">
                    <p className="text-[11px] font-bold text-slate-900">{svc.pricingExample}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{svc.note}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supporting Company Capabilities Banner */}
          <div className="mt-16 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3066BE] bg-[#edf4fc] px-3 py-1 rounded-full border border-[#6D96C5]/30">
                Full-Service Capabilities
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                Additional Creative & Strategic Services
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Atriowings Technologies supports client growth with end-to-end creative and multimedia production.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportingCapabilities.map((cap, idx) => {
                const Icon = cap.icon;
                return (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#3066BE]/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#3066BE] border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
                      <Icon className="w-5 h-5 text-[#119DA4]" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{cap.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE ATRIOWINGS */}
      <section id="why-atriowings" className="py-24 bg-white scroll-mt-20 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3066BE] bg-[#edf4fc] px-3.5 py-1.5 rounded-full border border-[#6D96C5]/30">
              The Atriowings Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Why Businesses & Associates Trust Atriowings
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              We combine enterprise engineering quality with disciplined project management and transparent commercial integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-[#3066BE]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#3066BE]/10 text-[#3066BE] flex items-center justify-center font-bold text-lg mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Technology Expertise</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Modern full-stack technologies including Next.js, Node.js, Flutter, and secure PostgreSQL cloud databases engineered for speed and reliability.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-[#119DA4]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#119DA4]/10 text-[#119DA4] flex items-center justify-center font-bold text-lg mb-5">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Domain Knowledge</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deep vertical experience across healthcare, real estate, travel, retail, and manufacturing, ensuring tailored solutions for real business needs.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-[#6D96C5]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#6D96C5]/10 text-[#6D96C5] flex items-center justify-center font-bold text-lg mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">On-Time Delivery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured development sprints, transparent milestone reporting, and dedicated project managers ensure delivery on schedule without delays.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-[#80DED9]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#80DED9]/20 text-[#119DA4] flex items-center justify-center font-bold text-lg mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Fair & Affordable</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Competitive pricing structures that maximize client value while providing healthy, sustainable, and reliable commission payouts to associates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW THE GROWTH ASSOCIATE PROGRAMME WORKS (9-STEP JOURNEY) */}
      <section id="how-it-works" className="py-24 bg-[#f8fafc] border-y border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#119DA4] bg-[#e7f7f8] px-3.5 py-1.5 rounded-full border border-[#80DED9]/40">
              Associate Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              The 9-Step Growth Associate Journey
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              From onboarding and exclusive client registration to official quotation delivery and guaranteed payout disbursement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {journeySteps.map((wf) => (
              <div
                key={wf.step}
                className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#3066BE]/40 transition-all duration-300 relative group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#3066BE] to-[#119DA4] bg-clip-text text-transparent">
                    {wf.step}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#edf4fc] text-[#3066BE] flex items-center justify-center font-bold text-xs group-hover:bg-[#3066BE] group-hover:text-white transition-colors duration-200">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#3066BE] transition-colors">
                  {wf.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {wf.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 & 8. COMMISSION MODEL & EARNINGS SIMULATOR */}
      <section id="earning" className="py-24 bg-[#152544] text-white scroll-mt-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#119DA4]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#80DED9] bg-[#119DA4]/20 px-3.5 py-1.5 rounded-full border border-[#80DED9]/30">
                Transparent Revenue Sharing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-4 leading-tight tracking-tight">
                Clear, Rule-Based Commission Engine
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed font-normal">
                No ambiguity or hidden terms. Our system enforces explicit mathematical rules based on verified client receipts and milestones.
              </p>

              <div className="mt-8 space-y-4">
                <div className="p-5 rounded-2xl bg-[#1e345e] border border-[#3066BE]/40 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#AEECEF]">Digital Marketing Model</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#119DA4]/30 text-[#80DED9] border border-[#80DED9]/30">
                      15% Monthly Recurring
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Earn recurring monthly commissions (15%) for every verified monthly invoice. <strong className="text-white">Media advertisement spend is strictly excluded</strong> to keep margins predictable.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1e345e] border border-[#119DA4]/40 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#80DED9]">Website & Mobile App Projects</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#3066BE]/40 text-[#AEECEF] border border-[#3066BE]/40">
                      12% Project Delivery
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Earn 12% commission on the agreed technical scope. Commission is disbursed <strong className="text-white">promptly upon final technical sign-off and accounts payment verification</strong>.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1e345e] border border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-200">Custom Enterprise Software</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      10% Project Delivery
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Earn 10% on high-ticket cloud ERP, CRM, and custom software systems upon project completion and client sign-off.
                  </p>
                </div>
              </div>
            </div>

            {/* Earnings Simulator */}
            <div className="bg-[#1a365d] rounded-3xl p-7 sm:p-9 border border-[#6D96C5]/30 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Associate Earnings Example</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Realistic quarterly portfolio illustration</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#119DA4]/20 text-[#80DED9] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-3 border-b border-slate-700/80">
                  <span className="text-slate-300 font-medium">1x Custom ERP Software (₹5,00,000 @ 10%)</span>
                  <span className="font-bold text-[#80DED9] text-sm">₹50,000</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/80">
                  <span className="text-slate-300 font-medium">2x Mobile Applications (₹3,00,000 @ 12%)</span>
                  <span className="font-bold text-[#80DED9] text-sm">₹36,000</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/80">
                  <span className="text-slate-300 font-medium">3x Business Websites (₹1,50,000 @ 12%)</span>
                  <span className="font-bold text-[#80DED9] text-sm">₹18,000</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/80">
                  <span className="text-slate-300 font-medium">4x Active DM Clients (₹1,20,000 fee @ 15% /mo)</span>
                  <span className="font-bold text-[#AEECEF] text-sm">₹18,000 / month</span>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm font-bold bg-[#152544] p-4 sm:p-5 rounded-2xl mt-4 border border-[#3066BE]/30 gap-2">
                  <span className="text-slate-300">Simulated Total Payout:</span>
                  <span className="text-[#80DED9] text-lg sm:text-xl font-extrabold">₹1,04,000 + ₹18,000/mo</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="block text-center py-4 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] font-bold text-sm text-white shadow-lg shadow-[#3066BE]/25 hover:shadow-xl transition-all duration-200"
                >
                  Register as an Associate to Start
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. OUR CLIENTS / PORTFOLIO SHOWCASE */}
      <section id="portfolio" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3066BE] bg-[#edf4fc] px-3.5 py-1.5 rounded-full border border-[#6D96C5]/30">
              Verified Brand Showcase
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Brands & Clients Associated with Atriowings
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Authentic client brands and verified project deliverables engineered by Atriowings Technologies across diverse business verticals.
            </p>
          </div>

          {/* Verified Client Logos Carousel/Grid */}
          <div className="mb-20">
            <div className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Trusted Client Network
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6 items-center justify-items-center">
              {clientLogos.map((client, idx) => (
                <div
                  key={idx}
                  className="w-full aspect-[3/2] p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-[#3066BE]/30 hover:shadow-sm transition-all duration-200 flex items-center justify-center group"
                  title={client.name}
                >
                  <img
                    src={client.file}
                    alt={`${client.name} Logo`}
                    className="max-h-10 max-w-[85%] object-contain filter grayscale group-hover:grayscale-0 transition-all duration-200"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Project Portfolio Filter & Showcase */}
          <div className="pt-10 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Featured Work Highlights</h3>
                <p className="text-xs text-slate-500 mt-1">Authentic project showcases from Atriowings portfolio</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPortfolioTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    portfolioTab === 'all' ? 'bg-white text-[#3066BE] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Projects
                </button>
                <button
                  type="button"
                  onClick={() => setPortfolioTab('web')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    portfolioTab === 'web' ? 'bg-white text-[#3066BE] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Web Solutions
                </button>
                <button
                  type="button"
                  onClick={() => setPortfolioTab('specialized')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    portfolioTab === 'specialized' ? 'bg-white text-[#3066BE] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Enterprise & Platforms
                </button>
                <button
                  type="button"
                  onClick={() => setPortfolioTab('campaign')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    portfolioTab === 'campaign' ? 'bg-white text-[#3066BE] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Campaigns & Media
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col group hover:border-[#3066BE]/40"
                >
                  <div className="h-48 sm:h-52 bg-slate-100 overflow-hidden relative">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md">
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#3066BE] transition-colors">
                        {project.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#119DA4] font-semibold">
                      <span>Atriowings Technologies Delivery</span>
                      <CheckCircle2 className="w-4 h-4 text-[#119DA4]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. GROWTH ASSOCIATE BENEFITS */}
      <section id="benefits" className="py-24 bg-[#f8fafc] border-y border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#119DA4] bg-[#e7f7f8] px-3.5 py-1.5 rounded-full border border-[#80DED9]/40">
              Partner Advantages
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Why Become a Business Growth Associate?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              We empower partners with complete enterprise infrastructure, zero fulfillment overhead, and guaranteed commission protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {associateBenefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#3066BE]/40 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] text-white flex items-center justify-center mb-5 shadow-md shadow-[#3066BE]/20 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#3066BE] transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white font-bold text-sm shadow-md transition-all duration-200"
            >
              <span>Join the Growth Associate Network Today</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3066BE] bg-[#edf4fc] px-3.5 py-1.5 rounded-full border border-[#6D96C5]/30">
              Clear Answers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Everything you need to know about Atriowings Technologies and the BGA Enterprise platform.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:border-[#3066BE]/40"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left p-5 sm:p-6 flex justify-between items-center font-bold text-slate-900 hover:bg-slate-50/60 transition-colors text-sm sm:text-base"
                >
                  <span className="pr-4">{faq.q}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${activeFaq === i ? 'bg-[#3066BE] text-white rotate-90' : 'bg-slate-100 text-slate-500'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 bg-[#edf4fc]/20 leading-relaxed animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. CONTACT ATRIOWINGS */}
      <section id="contact" className="py-24 bg-[#152544] text-white scroll-mt-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Contact Details Card */}
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80DED9] bg-[#119DA4]/20 px-3.5 py-1.5 rounded-full border border-[#80DED9]/30">
                Official Company Contacts
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight">
                Connect with Atriowings Technologies
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed font-normal">
                Reach our corporate headquarters in Chennai or discuss partnership opportunities with our dedicated Associate Relationship desk.
              </p>

              <div className="mt-8 space-y-5 text-xs sm:text-sm">
                {/* Company Name */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#3066BE]/20 text-[#80DED9] flex items-center justify-center shrink-0 border border-[#80DED9]/20">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Company Name</span>
                    <span className="font-semibold text-slate-100 text-sm">Atriowings Technologies</span>
                  </div>
                </div>

                {/* Office Address with Google Maps link */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#119DA4]/20 text-[#80DED9] flex items-center justify-center shrink-0 border border-[#80DED9]/20">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Corporate Office</span>
                    <span className="font-semibold text-slate-200 text-sm block">
                      No. 1, Gurudev Complex, 57th St, Venkatraman Nagar, Korattur, Chennai, Tamil Nadu 600080.
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=No.+1,+Gurudev+Complex,+57th+St,+Venkatraman+Nagar,+Korattur,+Chennai,+Tamil+Nadu+600080"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#80DED9] hover:underline font-bold mt-1"
                    >
                      <span>Get Directions on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Telephone */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#6D96C5]/20 text-[#AEECEF] flex items-center justify-center shrink-0 border border-[#AEECEF]/20">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Phone Number</span>
                    <a
                      href="tel:+918825948859"
                      className="font-bold text-white text-sm hover:text-[#80DED9] transition-colors"
                    >
                      +91 8825948859
                    </a>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Direct WhatsApp</span>
                    <a
                      href="https://wa.me/918825948859"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-300 text-sm hover:underline"
                    >
                      Chat on WhatsApp (+91 8825948859)
                    </a>
                  </div>
                </div>

                {/* Official Website */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#119DA4]/20 text-[#80DED9] flex items-center justify-center shrink-0 border border-[#80DED9]/20">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Official Website</span>
                    <a
                      href="https://atriowings.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-white text-sm hover:text-[#80DED9] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>https://atriowings.in/</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#6D96C5]/20 text-[#AEECEF] flex items-center justify-center shrink-0 border border-[#AEECEF]/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-medium">Official Email Address</span>
                    <a
                      href="mailto:info@atriowings.in"
                      className="font-bold text-white text-sm hover:text-[#80DED9] transition-colors"
                    >
                      info@atriowings.in
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend-Integrated Contact Form */}
            <div className="lg:col-span-7 bg-[#1a365d] p-7 sm:p-9 rounded-3xl border border-[#6D96C5]/30 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">Send a Message to Atriowings</h3>
              <p className="text-xs text-slate-300 mb-6 font-normal">
                Inquire about digital services or the Business Growth Associate programme. Our operations desk responds within 2-4 business hours.
              </p>

              {contactSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-100">Inquiry Received Successfully</p>
                    <p className="mt-1 leading-relaxed">{contactSuccess}</p>
                  </div>
                </div>
              )}

              {contactError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-100">Submission Error</p>
                    <p className="mt-1 leading-relaxed">{contactError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Phone / Mobile Number</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Company / Organization</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="e.g. Apex Solutions Ltd"
                      className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="e.g. Inquiry regarding Web Development or Associate Partnership"
                    className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Message / Inquiry Details *</label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Please describe your requirements, project details, or questions..."
                    className="w-full px-4 py-3 rounded-xl bg-[#152544] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#80DED9] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white font-bold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{contactLoading ? 'Sending Inquiry...' : 'Submit Inquiry to Atriowings'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="bg-[#0f172a] text-slate-400 py-14 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            {/* Column 1: Company Profile */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3066BE] to-[#119DA4] flex items-center justify-center text-white">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">Atriowings Technologies</span>
                  <span className="text-[10px] text-[#80DED9] block">BGA Enterprise Platform</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                A leading IT solutions company offering web development, digital marketing, mobile apps, and enterprise software.
              </p>
              <div className="mt-4 text-[11px] text-slate-400">
                <span>Official Website: </span>
                <a
                  href="https://atriowings.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#80DED9] hover:underline font-bold"
                >
                  atriowings.in
                </a>
              </div>
            </div>

            {/* Column 2: Official Address & Contacts */}
            <div className="md:col-span-1">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Corporate Office</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                No. 1, Gurudev Complex, 57th St, Venkatraman Nagar, Korattur, Chennai, Tamil Nadu 600080.
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <a href="tel:+918825948859" className="text-slate-300 hover:text-white">
                    +91 8825948859
                  </a>
                </div>
                <div>
                  <span className="text-slate-500">Email: </span>
                  <a href="mailto:info@atriowings.in" className="text-slate-300 hover:text-white">
                    info@atriowings.in
                  </a>
                </div>
              </div>
            </div>

            {/* Column 3: Navigation Links */}
            <div className="md:col-span-1">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Platform Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#about" className="hover:text-[#80DED9] transition-colors">About Atriowings</a></li>
                <li><a href="#services" className="hover:text-[#80DED9] transition-colors">Four BGA Services</a></li>
                <li><a href="#how-it-works" className="hover:text-[#80DED9] transition-colors">Associate Journey</a></li>
                <li><a href="#earning" className="hover:text-[#80DED9] transition-colors">Commission Engine</a></li>
                <li><a href="#portfolio" className="hover:text-[#80DED9] transition-colors">Clients & Portfolio</a></li>
                <li><a href="#benefits" className="hover:text-[#80DED9] transition-colors">Associate Benefits</a></li>
                <li><a href="#faq" className="hover:text-[#80DED9] transition-colors">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Column 4: Associate Quick Links */}
            <div className="md:col-span-1">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Associate Portal</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/register" className="text-[#80DED9] hover:underline font-bold flex items-center gap-1.5">
                    <span>Become a Growth Associate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    BGA Portal Login
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/918825948859"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1.5"
                  >
                    <span>Connect on WhatsApp</span>
                  </a>
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Social: </span>
                <a href="https://x.com/atriowings" target="_blank" rel="noopener noreferrer" className="hover:text-white mx-1">X (Twitter)</a> •
                <a href="https://www.linkedin.com/posts/atriowings_atriowings-atriowingstechnologies-business-activity-6910483218567741440-4G05/" target="_blank" rel="noopener noreferrer" className="hover:text-white mx-1">LinkedIn</a> •
                <a href="https://www.instagram.com/atriowings.technologies/" target="_blank" rel="noopener noreferrer" className="hover:text-white mx-1">Instagram</a>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>
              © 2026 Atriowings Technologies. All rights reserved. BGA Enterprise Management System.
            </p>
            <p>
              Corporate Office: No. 1, Gurudev Complex, Korattur, Chennai - 600080
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
