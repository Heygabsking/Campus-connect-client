import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, Video, Upload, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import CameraModal from '../components/CameraModal';
import toast from 'react-hot-toast';
import './Reels.css';

export default function Reels() {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Creation dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Comments drawer
  const [activeReelComments, setActiveComments] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Video playback
  const videoRefs = useRef({});

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const { data } = await api.get('/reels');
      setReels(data);
    } catch {
      toast.error('Could not load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureReel = async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('caption', caption || 'Short Reel 🎥');

      const { data } = await api.post('/reels', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReels([data, ...reels]);
      toast.success('Reel shared successfully');
      setShowCreate(false);
      setCaption('');
      setVideoFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload reel');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadReel = async (e) => {
    e.preventDefault();
    if (!videoFile) return;
    await handleCaptureReel(videoFile);
  };

  const toggleLike = async (id) => {
    try {
      const { data } = await api.put(`/reels/${id}/like`);
      setReels(reels.map(r => {
        if (r._id === id) {
          let newLikes = r.likes || [];
          if (data.liked) {
            newLikes = [...newLikes, user._id];
          } else {
            newLikes = newLikes.filter(uid => uid.toString() !== user._id.toString());
          }
          return { ...r, likes: newLikes };
        }
        return r;
      }));
    } catch {
      toast.error('Failed to like reel');
    }
  };

  const openComments = (reel) => {
    setActiveComments(reel._id);
    setCommentsList(reel.comments || []);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/reels/${activeReelComments}/comment`, { text: commentText });
      setCommentsList([...commentsList, data]);
      setReels(reels.map(r => {
        if (r._id === activeReelComments) {
          return { ...r, comments: [...(r.comments || []), data] };
        }
        return r;
      }));
      setCommentText('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const togglePlayback = (id) => {
    const video = videoRefs.current[id];
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  };

  const handleDeleteReel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      await api.delete(`/reels/${id}`);
      setReels(reels.filter(r => r._id !== id));
      toast.success('Reel deleted successfully');
    } catch {
      toast.error('Failed to delete reel');
    }
  };

  return (
    <div className="reels-page page-fade-in">
      <div className="reels-header card">
        <div className="header-info">
          <h1>🎬 Campus Reels</h1>
          <p>Watch and capture short moments on campus</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary create-reel-trigger">
          <Video size={16} /> Create Reel
        </button>
      </div>

      {loading ? (
        <div className="reels-loading">Loading reels…</div>
      ) : reels.length === 0 ? (
        <div className="reels-empty card">
          <Video size={40} className="empty-icon" />
          <h3>No reels shared yet</h3>
          <p>Be the first to share a moment! Click "Create Reel" to record or upload.</p>
        </div>
      ) : (
        <div className="reels-feed-container">
          {reels.map((r) => {
            const isLiked = r.likes?.includes(user?._id);
            return (
              <div key={r._id} className="reel-card">
                <video
                  ref={el => videoRefs.current[r._id] = el}
                  src={getMediaUrl(r.videoUrl)}
                  loop
                  autoPlay
                  muted
                  onClick={() => togglePlayback(r._id)}
                  className="reel-video"
                />

                {/* Overlays */}
                <div className="reel-overlay-bottom">
                  <div className="reel-author-card">
                    <img
                      src={getMediaUrl(r.author?.profilePhoto) || `https://ui-avatars.com/api/?name=${r.author?.username}&background=003087&color=fff`}
                      alt="" className="avatar" width={34} height={34}
                    />
                    <span className="reel-author-name">@{r.author?.username}</span>
                  </div>
                  <p className="reel-caption">{r.caption}</p>
                </div>

                <div className="reel-overlay-right">
                  <button onClick={() => toggleLike(r._id)} className={`action-btn ${isLiked ? 'liked' : ''}`}>
                    <Heart size={24} fill={isLiked ? 'var(--danger)' : 'none'} />
                    <span>{r.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => openComments(r)} className="action-btn">
                    <MessageCircle size={24} />
                    <span>{r.comments?.length || 0}</span>
                  </button>
                  {((r.author?._id === user?._id) || (user?.role === 'admin')) && (
                    <button onClick={() => handleDeleteReel(r._id)} className="action-btn delete-btn" style={{ color: 'var(--danger)', marginTop: '8px' }}>
                      <Trash2 size={24} />
                      <span style={{ fontSize: '10px' }}>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content card reels-creation-card">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Create Campus Reel</h3>
              <button onClick={() => setShowCreate(false)} className="close-btn"><X size={20} /></button>
            </div>
            
            <div className="reel-options-selector">
              <button onClick={() => setShowCamera(true)} className="option-btn">
                <Video size={28} />
                <span>Use Webcam</span>
              </button>
              <form onSubmit={handleUploadReel} className="upload-form">
                <label className="option-btn upload-label">
                  <Upload size={28} />
                  <span>Choose Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
                {videoFile && <span className="selected-filename">{videoFile.name}</span>}
                
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a reel caption…"
                  style={{ marginTop: 14 }}
                  required
                />
                
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 14 }}
                  disabled={uploading || !videoFile}
                >
                  {uploading ? 'Sharing…' : 'Share Uploaded Video'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Comments Drawer / Modal */}
      {activeReelComments && (
        <div className="modal-overlay">
          <div className="modal-content card comments-drawer">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Reel Comments</h3>
              <button onClick={() => setActiveComments(null)} className="close-btn"><X size={20} /></button>
            </div>

            <div className="reels-comments-list">
              {commentsList.length === 0 ? (
                <p className="no-comments-placeholder">No comments yet. Start the conversation!</p>
              ) : (
                commentsList.map((c, i) => (
                  <div key={i} className="comment">
                    <img
                      src={getMediaUrl(c.user?.profilePhoto) || `https://ui-avatars.com/api/?name=${c.user?.username}&background=003087&color=fff`}
                      alt="" className="avatar" width={24} height={24}
                    />
                    <div className="comment-body">
                      <span className="comment-user">@{c.user?.username}</span>
                      <span className="comment-text">{c.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleComment} className="comment-form">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                required
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 18px' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCamera}
        mode="video"
        onClose={() => setShowCamera(false)}
        onCapture={handleCaptureReel}
      />
    </div>
  );
}
