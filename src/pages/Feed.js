import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import { Image, Send } from 'lucide-react';
import './Feed.css';

export default function Feed() {
  const { user }                    = useAuth();
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [content, setContent]       = useState('');
  const [image, setImage]           = useState(null);
  const [category, setCategory]     = useState('general');
  const [posting, setPosting]       = useState(false);

  // Campus Events & Updates State
  const [updates, setUpdates]       = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  const fetchFeed = async () => {
    try {
      const { data } = await api.get('/posts/feed');
      setPosts(data);
    } catch { toast.error('Could not load feed'); }
    finally { setLoading(false); }
  };

  const fetchUpdates = async () => {
    try {
      const { data } = await api.get('/posts/campus-updates');
      setUpdates(data.slice(0, 5)); // Show top 5 recent announcements
    } catch {
      // Fail silently for sidebar
    } finally {
      setLoadingUpdates(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchUpdates();
  }, []);

  const submitPost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append('content', content);
      form.append('category', category);
      if (image) form.append('image', image);

      const { data } = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPosts([data, ...posts]);
      
      // If it's a campus update, also prepend to the updates sidebar list
      if (category === 'campus-update') {
        setUpdates((prev) => [data, ...prev].slice(0, 5));
      }

      setContent('');
      setImage(null);
      setCategory('general');
      toast.success('Post shared!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally { setPosting(false); }
  };

  const removePost = (id) => {
    setPosts(posts.filter(p => p._id !== id));
    setUpdates(updates.filter(u => u._id !== id));
  };

  return (
    <div className="feed-layout">
      <main className="feed-main">
        {/* Create Post */}
        <div className="create-post card">
          <div className="create-post-header">
            <img
              src={getMediaUrl(user?.profilePhoto) || `https://ui-avatars.com/api/?name=${user?.username}&background=003087&color=fff`}
              alt="" className="avatar" width={40} height={40}
            />
            <form onSubmit={submitPost} className="create-post-form">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`What's happening on campus, @${user?.username}?`}
                rows={3}
                style={{ resize: 'none', border: 'none', padding: '8px 0', fontSize: 15, background: 'transparent' }}
              />
              <div className="create-post-footer">
                <label className="image-upload-btn">
                  <Image size={18} /> Photo
                  <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                {image && <span className="image-name">{image.name}</span>}
                {user?.role === 'admin' && (
                  <select value={category} onChange={e => setCategory(e.target.value)} className="category-select">
                    <option value="general">General</option>
                    <option value="campus-update">Campus Update</option>
                  </select>
                )}
                <button type="submit" className="btn-primary post-submit-btn" disabled={posting || !content.trim()}>
                  <Send size={15} /> {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="feed-loading">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="feed-empty card">
            <p>No posts yet. Follow people or be the first to post! 🎓</p>
          </div>
        ) : (
          posts.map(p => <PostCard key={p._id} post={p} onDelete={removePost} />)
        )}
      </main>

      <aside className="feed-sidebar-right">
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
            📢 USIU-Africa
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Stay connected with your campus community. Follow classmates, share updates, and never miss important announcements.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
            📅 Campus Events & Updates
          </h3>
          {loadingUpdates ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading updates…</p>
          ) : updates.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No updates posted yet.</p>
          ) : (
            <div className="updates-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {updates.map(up => (
                <div key={up._id} className="update-item" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{up.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
                    <span>@{up.author?.username}</span>
                    <span>{new Date(up.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
