import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, ShieldCheck, UserCheck, AlertCircle, LogOut, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

export const PortalHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; message: string; link?: string } | null>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const h = headerRef.current.offsetHeight;
        if (h > 0) {
          document.documentElement.style.setProperty('--portal-header-height', `${h}px`);
        }
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [title, subtitle]);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/api/notifications');
      const list = data.notifications || [];
      const count = data.unreadCount || 0;

      // Real-time toast alert in the top-right corner on login if unread, or when a new unread arrives
      if (list.length > 0 && !list[0].isRead) {
        const latest = list[0];
        const seenKey = `notif_seen_${latest.id}`;
        const hasBeenSeen = sessionStorage.getItem(seenKey);

        if (!hasBeenSeen || (prevUnreadRef.current !== null && count > prevUnreadRef.current)) {
          sessionStorage.setItem(seenKey, 'true');
          setActiveToast({
            id: latest.id,
            title: latest.title,
            message: latest.message,
            link: latest.link,
          });
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 8000);
        }
      }
      prevUnreadRef.current = count;

      setNotifications(list);
      setUnreadCount(count);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();

    let intervalId: any = null;
    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(fetchNotifications, 20000); // 20s real-time poll
      }
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await apiRequest('/api/notifications/mark-all-read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      // ignore
    }
  };

  // Resolve accurate destination URL for any notification based on user role and content
  const resolveNotificationLink = (n: any): string => {
    const role = user?.role || '';
    const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
    const rawLink = (n.link || '').trim();

    // 1. If notification already has a specific route
    if (rawLink) {
      if (rawLink.startsWith('/bga/clients') || rawLink === '/bga/client') return '/bga?tab=clients';
      if (rawLink.startsWith('/bga/projects') || rawLink.startsWith('/bga/work-orders') || rawLink.startsWith('/bga/workorders')) return '/bga?tab=projects';
      if (rawLink.startsWith('/bga/quotations') || rawLink.startsWith('/bga/quotes')) return '/bga?tab=quotations';
      if (rawLink.startsWith('/bga/enquiries') || rawLink.startsWith('/bga/inquiries')) return '/bga?tab=enquiries';
      if (rawLink.startsWith('/bga/earnings') || rawLink.startsWith('/bga/commissions')) return '/bga?tab=earnings';
      if (rawLink.startsWith('/bga/resources')) return '/bga?tab=resources';
      if (rawLink.startsWith('/bga/profile')) return '/bga?tab=profile';
      if (rawLink.startsWith('/bga/support')) return '/bga?tab=support';

      if (rawLink.startsWith('/admin/quotations')) return '/admin?tab=quotations';
      if (rawLink.startsWith('/admin/work-orders') || rawLink.startsWith('/admin/workorders')) return '/admin?tab=work-orders';
      if (rawLink.startsWith('/admin/enquiries') || rawLink.startsWith('/admin/inquiries')) return '/admin?tab=enquiry';
      if (rawLink.startsWith('/admin/technical') || rawLink.startsWith('/admin/projects')) return '/admin?tab=technical';
      if (rawLink.startsWith('/admin/bga')) return '/admin?tab=bga';
      if (rawLink.startsWith('/admin/commissions')) return '/admin?tab=commissions';
      if (rawLink.startsWith('/admin/clients')) return '/admin?tab=clients';

      if (rawLink.startsWith('/accounts/quotations') || rawLink.startsWith('/accounts/quotation-requests')) return '/accounts?tab=quotation-requests';
      if (rawLink.startsWith('/accounts/work-orders') || rawLink.startsWith('/accounts/payments')) return '/accounts?tab=payments-work-orders';
      if (rawLink.startsWith('/accounts/commissions')) return '/accounts?tab=commissions';

      if (rawLink !== '/bga' && rawLink !== '/admin' && rawLink !== '/accounts' && rawLink !== '/technical') {
        return rawLink;
      }
    }

    // 2. Topic-based routing based on notification content
    if (role === 'BGA') {
      if (
        text.includes('project') ||
        text.includes('work order') ||
        text.includes('deliverable') ||
        text.includes('technical team') ||
        text.includes('advance payment verified') ||
        text.includes('automatically routed') ||
        text.includes('ready to start') ||
        text.includes('released to technical') ||
        text.includes('handover') ||
        text.includes('correction_required') ||
        text.includes('final payment')
      ) {
        return '/bga?tab=projects';
      }
      if (text.includes('quotation') || text.includes('quote')) {
        return '/bga?tab=quotations';
      }
      if (text.includes('enquiry') || text.includes('inquiry') || text.includes('scope')) {
        return '/bga?tab=enquiries';
      }
      if (text.includes('commission') || text.includes('earning') || text.includes('payout') || text.includes('settled')) {
        return '/bga?tab=earnings';
      }
      if (text.includes('client') || text.includes('welcome') || text.includes('registering client')) {
        return '/bga?tab=clients';
      }
      if (text.includes('support') || text.includes('ticket')) {
        return '/bga?tab=support';
      }
      if (text.includes('profile') || text.includes('kyc') || text.includes('account active')) {
        return '/bga?tab=profile';
      }
      return '/bga?tab=dashboard';
    }

    if (role === 'ADMIN') {
      if (text.includes('enquiry') || text.includes('inquiry')) return '/admin?tab=enquiry';
      if (text.includes('quotation') || text.includes('quote')) return '/admin?tab=quotations';
      if (text.includes('work order') || text.includes('advance verified') || text.includes('payment verified') || text.includes('released')) return '/admin?tab=work-orders';
      if (text.includes('technical') || text.includes('project') || text.includes('deliverable')) return '/admin?tab=technical';
      if (text.includes('bga') || text.includes('associate') || text.includes('kyc') || text.includes('registration')) return '/admin?tab=bga';
      if (text.includes('commission')) return '/admin?tab=commissions';
      if (text.includes('client')) return '/admin?tab=clients';
      return '/admin?tab=dashboard';
    }

    if (role === 'ACCOUNTS') {
      if (text.includes('quotation') || text.includes('quote')) return '/accounts?tab=quotation-requests';
      if (text.includes('payment') || text.includes('work order') || text.includes('advance') || text.includes('receipt')) return '/accounts?tab=payments-work-orders';
      if (text.includes('commission') || text.includes('payout')) return '/accounts?tab=commissions';
      return '/accounts?tab=dashboard';
    }

    if (role === 'TECHNICAL') {
      return '/technical';
    }

    return rawLink || '/';
  };

  const handleNotificationClick = (n: any) => {
    // 1. Mark as read immediately in UI
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      apiRequest(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    }

    // 2. Resolve target destination
    const destination = resolveNotificationLink(n);

    // 3. Dispatch tab switch event for mounted portals
    if (destination.includes('tab=')) {
      const match = destination.match(/tab=([^&]+)/);
      if (match && match[1]) {
        window.dispatchEvent(
          new CustomEvent('portal-switch-tab', { detail: { tab: match[1] } })
        );
      }
    }

    // 4. Redirect to destination without closing the notification panel
    navigate(destination);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[#edf4fc] text-[#3066BE] border-[#6D96C5]/40';
      case 'BGA':
        return 'bg-[#e7f7f8] text-[#119DA4] border-[#80DED9]/60';
      case 'ACCOUNTS':
        return 'bg-[#edf4fc] text-[#3066BE] border-[#6D96C5]/40';
      case 'TECHNICAL':
        return 'bg-slate-100 text-[#152544] border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header ref={headerRef} className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-subtle shrink-0">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center shrink-0 group py-0.5"
            title="Atriowings Technologies"
          >
            <img
              src="/favicon.png"
              alt="Atriowings Technologies"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>
          <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 block truncate leading-none mb-0.5">
              Atriowings Technologies
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate hidden md:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-[#3066BE] hover:bg-[#edf4fc] relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#119DA4] rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2.5 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Notifications {unreadCount > 0 && <span className="text-[#119DA4]">({unreadCount} new)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[#3066BE] hover:underline font-bold"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifs(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Close"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors group relative ${
                          !n.isRead ? 'bg-[#edf4fc]/50 font-medium' : ''
                        }`}
                        title="Click to redirect to this section"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#119DA4] shrink-0" />
                            )}
                            <span className="font-bold text-slate-900 group-hover:text-[#3066BE] transition-colors truncate">
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#3066BE] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open section</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-3 pl-3.5 border-l border-slate-200">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.name}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-sm font-bold text-slate-900">{user?.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(
                    user?.role || ''
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 justify-end text-[11px] text-slate-500 mt-0.5">
                <span>{user?.email}</span>
                {user?.role === 'BGA' && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      user.status === 'ACTIVE'
                        ? 'bg-[#e7f7f8] text-[#119DA4]'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {user.status}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Notification Toast Pill - Portaled to document.body so it is never clipped by header backdrop-blur */}
      {typeof document !== 'undefined' &&
        activeToast &&
        createPortal(
          <div
            role="alert"
            aria-live="assertive"
            onClick={() => {
              handleNotificationClick(activeToast);
              setActiveToast(null);
            }}
            className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] sm:w-[420px] bg-slate-900/98 text-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.45)] p-4 border border-slate-700/80 cursor-pointer animate-fadeIn transition-all duration-300 flex items-start gap-3.5 hover:bg-slate-900 hover:border-[#3066BE] hover:shadow-[0_25px_60px_rgba(48,102,190,0.35)] group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#3066BE]/25 text-[#80DED9] border border-[#3066BE]/40 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-extrabold tracking-wider text-[#80DED9] uppercase bg-[#119DA4]/20 px-2 py-0.5 rounded-full border border-[#119DA4]/30">
                  New Notification
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToast(null);
                  }}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-colors"
                  title="Dismiss"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-white leading-snug break-words">
                {activeToast.title}
              </p>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-1 break-words">
                {activeToast.message}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#80DED9] group-hover:underline">
                <span>Click to open section</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
