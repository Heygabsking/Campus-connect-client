import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import toast from 'react-hot-toast';
import './PostCard.css';

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [likes, setLikes]       = useState(post.likes?.length || 0);
  const [liked, setLiked]       = useState(post.likes?.includes(user?._id));
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShow] = useState(false);
  const [commentText, setText]  = useState('');

  const toggleLike = async () => {
    try {
      const { data } = await api.put(`/posts/${post._id}/like`);
      setLikes(data.likes);
      setLiked(data.liked);
    } catch { toast.error('Failed to like'); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/posts/${post._id}/comment`, { text: commentText });
      setComments([...comments, data]);
      setText('');
    } catch { toast.error('Failed to comment'); }
  };

  const handleCommentLike = async (commentId) => {
    if (!user) return;
    try {
      const { data } = await api.put(`/posts/${post._id}/comment/${commentId}/like`);
      setComments(comments.map(c => {
        if (c._id === commentId) {
          let newLikes = c.likes ? [...c.likes] : [];
          if (data.liked) {
            newLikes.push(user._id);
          } else {
            newLikes = newLikes.filter(id => id.toString() !== user._id.toString());
          }
          return { ...c, likes: newLikes };
        }
        return c;
      }));
    } catch (err) {
      toast.error('Failed to like comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch { toast.error('Failed to delete'); }
  };

  const handleFlag = async () => {
    try {
      await api.put(`/posts/${post._id}/flag`);
      toast.success('Post flagged');
    } catch { toast.error('Failed to flag'); }
  };

  const isOwner = post.author?._id === user?._id;
  const isAdmin = user?.role === 'admin';
  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  };

  return (
    <div className={`post-card ${post.category === 'campus-update' ? 'campus-update' : ''}`}>
      <div className="post-header">
        <Link to={`/profile/${post.author?._id}`} className="post-author">
          <img
            src={getMediaUrl(post.author?.profilePhoto) || `https://ui-avatars.com/api/?name=${post.author?.username}&background=003087&color=fff`}
            alt="" className="avatar" width={38} height={38}
          />
          <div>
            <span className="post-username">@{post.author?.username}</span>
            {post.category === 'campus-update' && <span className="badge-update">Campus Update</span>}
            <span className="post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        <div className="post-actions-top">
          {isAdmin && !isOwner && (
            <button onClick={handleFlag} className="icon-btn" title="Flag post"><Flag size={16} /></button>
          )}
          {(isOwner || isAdmin) && (
            <button onClick={handleDelete} className="icon-btn danger" title="Delete post"><Trash2 size={16} /></button>
          )}
        </div>
      </div>

      <p className="post-content">{post.content}</p>
      {post.imageUrl && <img src={getMediaUrl(post.imageUrl)} alt="post" className="post-image" />}

      <div className="post-footer">
        <button className={`react-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
          <Heart size={17} fill={liked ? '#e03c3c' : 'none'} color={liked ? '#e03c3c' : 'currentColor'} />
          <span>{likes}</span>
        </button>
        <button className="react-btn" onClick={() => setShow(!showComments)}>
          <MessageCircle size={17} /> <span>{comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.map((c, i) => (
            <div key={c._id || i} className="comment" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <img
                  src={getMediaUrl(c.user?.profilePhoto) || `https://ui-avatars.com/api/?name=${c.user?.username}&background=003087&color=fff`}
                  alt="" className="avatar" width={26} height={26}
                />
                <div className="comment-body">
                  <span className="comment-user">@{c.user?.username}</span>
                  <span className="comment-text">{c.text}</span>
                </div>
              </div>
              <button
                onClick={() => handleCommentLike(c._id)}
                className={`comment-like-btn ${c.likes?.includes(user?._id) ? 'liked' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: c.likes?.includes(user?._id) ? '#e03c3c' : 'var(--muted)',
                  fontSize: '12px',
                  padding: '4px'
                }}
                title="Like comment"
              >
                <Heart size={12} fill={c.likes?.includes(user?._id) ? '#e03c3c' : 'none'} color={c.likes?.includes(user?._id) ? '#e03c3c' : 'currentColor'} />
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.likes?.length || 0}</span>
              </button>
            </div>
          ))}
          <form onSubmit={submitComment} className="comment-form">
            <input value={commentText} onChange={e => setText(e.target.value)} placeholder="Add a comment…" />
            <button type="submit" className="btn-primary" style={{ padding: '8px 14px', borderRadius: 8 }}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
