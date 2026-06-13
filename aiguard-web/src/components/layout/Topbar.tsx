import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, LogOut, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user?.fullName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder={t('Search system, devices, rules...', 'Tìm hệ thống, thiết bị, chính sách...')}
        />
      </div>

      <div className="topbar-actions">
        <div className="alert-banner-indicator">
          <ShieldAlert size={16} className="text-emerald-400" />
          <span>{t('DLP Protection Engine is Active', 'Bộ máy bảo vệ DLP đang hoạt động')}</span>
        </div>

        <LanguageSwitcher compact />
        <NotificationCenter />

        <div className="relative" ref={menuRef}>
          <div 
            className="user-profile-dropdown" 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={t('User Menu', 'Menu người dùng')}
          >
            <div className="user-details">
              <span className="user-name">{user?.fullName || t('User', 'Người dùng')}</span>
              <span className="user-dept">
                {user?.role || 'Unknown'}{user?.departmentName ? ` / ${user.departmentName}` : ''}
              </span>
            </div>
            <div className="user-avatar">{initials}</div>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-xl py-2 z-50 shadow-2xl flex flex-col">
              <Link 
                to="/app/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 font-medium no-underline transition-all hover:bg-white/5 hover:text-white"
                onClick={() => setShowProfileMenu(false)}
              >
                <User size={16} />
                {t('Profile', 'Hồ sơ cá nhân')}
              </Link>
              <button 
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  window.location.href = '/';
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 font-medium no-underline transition-all hover:bg-red-500/10 hover:text-red-300 w-full text-left"
              >
                <LogOut size={16} />
                {t('Sign Out', 'Đăng xuất')}
              </button>
            </div>
          )}
        </div>

        <button 
          className="logout-button" 
          title={t('Sign Out', 'Đăng xuất')} 
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
