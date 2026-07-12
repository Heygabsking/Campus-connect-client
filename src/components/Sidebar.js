import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Search, Shield, LogOut, Bell, Film, MessageSquare, BookOpen } from 'lucide-react';
import api, { getMediaUrl } from '../utils/api';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch (err) {
        // Fail silently
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle manual/instant reset of badge when navigation moves to notifications
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const nav = [
    { to: '/feed',      icon: <Home size={20} />,   label: 'Home' },
    { to: '/search',    icon: <Search size={20} />,  label: 'Search' },
    { to: '/reels',     icon: <Film size={20} />,   label: 'Reels' },
    { to: '/messages',  icon: <MessageSquare size={20} />, label: 'Messages' },
    { to: '/lecturers', icon: <BookOpen size={20} />, label: 'Lecturers' },
    {
      to: '/notifications',
      icon: (
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="badge-unread" style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: '50%',
              minWidth: '14px',
              height: '14px',
              fontSize: '9px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px'
            }}>
              {unreadCount}
            </span>
          )}
        </div>
      ),
      label: 'Notifications'
    },
    {
      to: `/profile/${user?._id}`,
      icon: (
        <img
          src={getMediaUrl(user?.profilePhoto) || `https://ui-avatars.com/api/?name=${user?.username}&background=003087&color=fff`}
          alt=""
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: location.pathname === `/profile/${user?._id}` ? '1.5px solid var(--primary)' : '1px solid var(--border)'
          }}
        />
      ),
      label: 'Profile'
    },
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
