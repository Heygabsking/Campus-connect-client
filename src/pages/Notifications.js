import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';
import api, { getMediaUrl } from '../utils/api';
import toast from 'react-hot-toast';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      // Mark all as read
      await api.put('/notifications/read');
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="notif-icon-heart" size={16} fill="var(--danger)" color="var(--danger)" />;
      case 'comment':
        return <MessageSquare className="notif-icon-comment" size={16} color="var(--primary)" />;
      case 'comment-like':
        return <Heart className="notif-icon-comment-like" size={14} fill="#e03c3c" color="#e03c3c" />;
      case 'follow':
        return <UserPlus className="notif-icon-follow" size={16} color="#10b981" />;
      default:
        return <Sparkles size={16} />;
    }
  };

  const getMessage = (n) => {
    const username = n.sender?.username ? `@${n.sender.username}` : 'Someone';
    switch (n.type) {
      case 'like':
        return (
          <span>
            <strong className="notif-user">{username}</strong> liked your post
            {n.post?.content && <span className="notif-snippet"> "{n.post.content.slice(0, 40)}..."</span>}
          </span>
        );
      case 'comment':
        return (
          <span>
            <strong className="notif-user">{username}</strong> commented on your post: 
            <span className="notif-snippet"> "{n.commentText || '...'}"</span>
          </span>
        );
      case 'comment-like':
        return (
          <span>
            <strong className="notif-user">{username}</strong> liked your comment:
            <span className="notif-snippet"> "{n.commentText || '...'}"</span>
          </span>
        );
      case 'follow':
        return (
          <span>
            <strong className="notif-user">{username}</strong> started following you
          </span>
        );
      default:
        return <span>New activity from <strong className="notif-user">{username}</strong></span>;
    }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div className="notifications-page page-fade-in">
      <div className="notifications-header card">
        <div className="header-info">
          <h1>🔔 Notifications</h1>
          <p>Updates on your campus engagement and activity</p>
        </div>
        {!loading && notifications.some(n => !n.isRead) && (
          <span className="unread-banner">
            <CheckCircle2 size={14} /> Marked all as read
          </span>
        )}
      </div>

      {loading ? (
        <div className="notifications-loading">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty card">
          <Sparkles size={40} className="empty-icon" />
          <h3>All caught up!</h3>
          <p>When classmates like or comment on your thoughts, you'll see them here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n._id} className={`notifications-row card ${!n.isRead ? 'unread' : ''}`}>
              <div className="notif-avatar-wrapper">
                <Link to={`/profile/${n.sender?._id}`}>
                  <img
                    src={getMediaUrl(n.sender?.profilePhoto) || `https://ui-avatars.com/api/?name=${n.sender?.username || 'user'}&background=003087&color=fff`}
                    alt="" className="avatar notif-avatar" width={40} height={40}
                  />
                </Link>
                <div className="notif-badge">{getIcon(n.type)}</div>
              </div>
              <div className="notif-content">
                <p className="notif-text">{getMessage(n)}</p>
                <span className="notif-time">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.isRead && <div className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
