import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Search, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';

const ROLE_LABELS: Record<string, string> = {
  PlatformAdmin: 'Quản trị nền tảng',
  TenantOwner: 'Chủ doanh nghiệp',
  SecurityAdmin: 'Quản trị bảo mật',
  DepartmentManager: 'Trưởng phòng ban',
  Employee: 'Nhân viên'
};

const ROLE_STATUS: Record<string, string> = {
  PlatformAdmin: 'SaaS operations đang hoạt động',
  TenantOwner: 'Tenant workspace đã sẵn sàng',
  SecurityAdmin: 'DLP protection đang hoạt động',
  DepartmentManager: 'Duyệt yêu cầu phòng ban',
  Employee: 'My Usage portal đang bảo vệ'
};

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleLabel = ROLE_LABELS[user?.role || ''] || 'Người dùng';
  const roleStatus = ROLE_STATUS[user?.role || ''] || 'AIGuard đang hoạt động';

  const initials = user?.fullName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AG';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const signOut = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="Tìm khách hàng, thiết bị, chính sách, log..." />
      </div>

      <div className="topbar-actions">
        <div className="alert-banner-indicator">
          <ShieldAlert size={16} className="text-emerald-400" />
          <span>{roleStatus}</span>
        </div>

        <LanguageSwitcher compact />
        <NotificationCenter />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="user-profile-dropdown"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Menu người dùng"
          >
            <div className="user-details">
              <span className="user-name">{user?.fullName || 'Người dùng'}</span>
              <span className="user-dept">
                {roleLabel}{user?.departmentName ? ` / ${user.departmentName}` : ''}
              </span>
            </div>
            <div className="user-avatar">{initials}</div>
          </button>

          {showProfileMenu && (
            <div className="profile-menu">
              <Link
                to="/app/profile"
                className="profile-menu-item"
                onClick={() => setShowProfileMenu(false)}
              >
                <User size={16} />
                Hồ sơ cá nhân
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  signOut();
                }}
                className="profile-menu-item danger"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>

        <button className="logout-button" title="Đăng xuất" onClick={signOut}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
