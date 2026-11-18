import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, ShieldCheck, UserCheck, AlertCircle, LogOut, CheckCircle2, KeyRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { ChangePasswordModal } from './ChangePasswordModal';

export const PortalHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifs]);

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
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();

    let intervalId: any = null;
    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(fetchNotifications, 45000); // 45s poll
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
          <div className="relative" ref={notifRef}>
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
                        onClick={() => {
                          if (n.link) navigate(n.link);
                          setShowNotifs(false);
                        }}
                        className={`p-3.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          !n.isRead ? 'bg-[#edf4fc]/50 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-3 pl-3.5 border-l border-slate-200">
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
              onClick={() => setShowPasswordModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-[#3066BE] hover:bg-[#edf4fc] transition-colors"
              title="Change Account Password"
            >
              <KeyRound className="w-5 h-5" />
            </button>

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

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
};
