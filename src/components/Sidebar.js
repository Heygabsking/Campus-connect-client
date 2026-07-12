import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Search, User, Shield, LogOut } from 'lucide-react';
import { getMediaUrl } from '../utils/api';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  const nav = [
    { to: '/feed',   icon: <Home size={20} />,   label: 'Home' },
    { to: '/search', icon: <Search size={20} />,  label: 'Search' },
    { to: `/profile/${user?._id}`, icon: <User size={20} />, label: 'Profile' },
  ];

  if (user?.role === 'admin')
    nav.push({ to: '/admin', icon: <Shield size={20} />, label: 'Admin' });

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">CC</div>
        <span>CampusConnect</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, icon, label }) => (
          <Link key={to} to={to} className={`sidebar-link ${location.pathname === to ? 'active' : ''}`}>
            {icon} <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <img
          src={getMediaUrl(user?.profilePhoto) || `https://ui-avatars.com/api/?name=${user?.username}&background=003087&color=fff`}
          alt="avatar" className="avatar" width={36} height={36}
        />
        <div className="sidebar-user-info">
          <p className="sidebar-username">@{user?.username}</p>
          <p className="sidebar-role">{user?.role}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="logout-btn" title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
