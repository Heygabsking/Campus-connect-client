import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ShieldOff, Trash2 } from 'lucide-react';
import './Admin.css';

export default function Admin() {
  const [users, setUsers]     = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [tab, setTab]         = useState('users');

  useEffect(() => {
    api.get('/users/all').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users'));
    api.get('/posts/feed').then(r => setFlagged(r.data.filter(p => p.isFlagged))).catch(() => {});
  }, []);

  const suspend = async (userId, suspend) => {
    try {
      const { data } = await api.put(`/users/${userId}/suspend`, { suspend });
      setUsers(users.map(u => u._id === userId ? data : u));
      toast.success(suspend ? 'User suspended' : 'User reinstated');
    } catch { toast.error('Failed'); }
  };

  const deletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setFlagged(flagged.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="admin-page">
      <div className="admin-header card">
        <h1>🛡 Admin Panel</h1>
        <p>USIU-Africa CampusConnect moderation</p>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
        <button className={`tab-btn ${tab === 'flagged' ? 'active' : ''}`} onClick={() => setTab('flagged')}>
          Flagged Posts ({flagged.length})
        </button>
      </div>

      {tab === 'users' && (
        <div className="admin-list">
          {users.map(u => (
            <div key={u._id} className="admin-row card">
              <img
                src={u.profilePhoto || `https://ui-avatars.com/api/?name=${u.username}&background=003087&color=fff`}
                alt="" className="avatar" width={40} height={40}
              />
              <div className="admin-user-info">
                <span className="admin-username">@{u.username}</span>
                <span className="admin-email">{u.email}</span>
                {u.isSuspended && <span className="suspended-badge">Suspended</span>}
              </div>
              <span className="admin-role">{u.role}</span>
              <button
                onClick={() => suspend(u._id, !u.isSuspended)}
                className={u.isSuspended ? 'btn-outline' : 'btn-danger'}
              >
                <ShieldOff size={14} /> {u.isSuspended ? 'Reinstate' : 'Suspend'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'flagged' && (
        <div className="admin-list">
          {flagged.length === 0 && <p className="no-flagged">No flagged posts 🎉</p>}
          {flagged.map(p => (
            <div key={p._id} className="admin-row card">
              <div className="flagged-post-content">
                <span className="admin-username">@{p.author?.username}</span>
                <p>{p.content}</p>
              </div>
              <button className="btn-danger" onClick={() => deletePost(p._id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
