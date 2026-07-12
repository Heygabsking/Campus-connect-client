/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import PostCard from '../components/PostCard';
import CameraModal from '../components/CameraModal';
import toast from 'react-hot-toast';
import { Image, Send, Plus, ChevronLeft, ChevronRight, X, Camera, Upload, Trash2 } from 'lucide-react';
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

  // Stories State
  const [stories, setStories]               = useState([]);
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeUserStoryIdx, setActiveUserStoryIdx] = useState(null); // Index in groupedStories
  const [activeStoryIdx, setActiveStoryIdx] = useState(0); // Index inside user's story list
  const [showCamera, setShowCamera]         = useState(false);
  const [showStoryOpts, setShowStoryOpts]   = useState(false);

  const storyTimerRef = useRef(null);

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

  const fetchStories = async () => {
    try {
      const { data } = await api.get('/stories');
      setStories(data);
      setGroupedStories(groupStories(data));
    } catch {
      // Fail silently
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchUpdates();
    fetchStories();
  }, []);

  const groupStories = (flatStories) => {
    const groups = {};
    flatStories.forEach(s => {
      const uid = s.user?._id;
      if (!uid) return;
      if (!groups[uid]) {
        groups[uid] = {
          user: s.user,
          stories: []
        };
      }
      groups[uid].stories.push(s);
    });
    return Object.values(groups);
  };

  // Stories slideshow navigation timer
  useEffect(() => {
    if (activeUserStoryIdx !== null) {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);

      const currentGroup = groupedStories[activeUserStoryIdx];
      const maxStories = currentGroup.stories.length;

      storyTimerRef.current = setTimeout(() => {
        if (activeStoryIdx < maxStories - 1) {
          // View next story of current user
          const nextIdx = activeStoryIdx + 1;
          setActiveStoryIdx(nextIdx);
          markStoryAsViewed(currentGroup.stories[nextIdx]._id);
        } else {
          // Proceed to next user's story or close
          if (activeUserStoryIdx < groupedStories.length - 1) {
            const nextUserIdx = activeUserStoryIdx + 1;
            setActiveUserStoryIdx(nextUserIdx);
            setActiveStoryIdx(0);
            markStoryAsViewed(groupedStories[nextUserIdx].stories[0]._id);
          } else {
            closeStoryViewer();
          }
        }
      }, 5000);
    }
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [activeUserStoryIdx, activeStoryIdx, groupedStories]);

  const markStoryAsViewed = async (storyId) => {
    try {
      await api.put(`/stories/${storyId}/view`);
      // Update local views list
      setStories(stories.map(s => {
        if (s._id === storyId && !s.views.includes(user?._id)) {
          return { ...s, views: [...s.views, user?._id] };
        }
        return s;
      }));
      setGroupedStories(prev => prev.map(group => {
        return {
          ...group,
          stories: group.stories.map(s => {
            if (s._id === storyId && !s.views.includes(user?._id)) {
              return { ...s, views: [...s.views, user?._id] };
            }
            return s;
          })
        };
      }));
    } catch {
      // Fail silently
    }
  };

  const closeStoryViewer = () => {
    setActiveUserStoryIdx(null);
    setActiveStoryIdx(0);
    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
  };

  const nextStory = () => {
    const currentGroup = groupedStories[activeUserStoryIdx];
    if (activeStoryIdx < currentGroup.stories.length - 1) {
      const nextIdx = activeStoryIdx + 1;
      setActiveStoryIdx(nextIdx);
      markStoryAsViewed(currentGroup.stories[nextIdx]._id);
    } else if (activeUserStoryIdx < groupedStories.length - 1) {
      const nextUserIdx = activeUserStoryIdx + 1;
      setActiveUserStoryIdx(nextUserIdx);
      setActiveStoryIdx(0);
      markStoryAsViewed(groupedStories[nextUserIdx].stories[0]._id);
    } else {
      closeStoryViewer();
    }
  };

  const prevStory = () => {
    if (activeStoryIdx > 0) {
      const prevIdx = activeStoryIdx - 1;
      setActiveStoryIdx(prevIdx);
      markStoryAsViewed(groupedStories[activeUserStoryIdx].stories[prevIdx]._id);
    } else if (activeUserStoryIdx > 0) {
      const prevUserIdx = activeUserStoryIdx - 1;
      const prevGroup = groupedStories[prevUserIdx];
      setActiveUserStoryIdx(prevUserIdx);
      setActiveStoryIdx(prevGroup.stories.length - 1);
      markStoryAsViewed(prevGroup.stories[prevGroup.stories.length - 1]._id);
    } else {
      closeStoryViewer();
    }
  };

  const handleCaptureStory = async (file) => {
    try {
      const form = new FormData();
      form.append('media', file);

      const { data } = await api.post('/stories', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedStories = [...stories, data];
      setStories(updatedStories);
      setGroupedStories(groupStories(updatedStories));
      toast.success('Story shared successfully');
      setShowStoryOpts(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share story');
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    try {
      await api.delete(`/stories/${storyId}`);
      
      const updatedStories = stories.filter(s => s._id !== storyId);
      setStories(updatedStories);
      
      const grouped = groupStories(updatedStories);
      setGroupedStories(grouped);
      
      toast.success('Story deleted');
      
      const currentGroup = groupedStories[activeUserStoryIdx];
      if (currentGroup.stories.length > 1) {
        setActiveStoryIdx(0);
      } else {
        closeStoryViewer();
      }
    } catch {
      toast.error('Failed to delete story');
    }
  };

  const handleUploadStoryFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleCaptureStory(file);
  };

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
      
      // If the post was flagged by content moderation, we warn the user but still append it
      if (data.isFlagged) {
        toast.error('Warning: Your post contains content flagged for review by moderators.');
      } else {
        toast.success('Post shared!');
      }

      setPosts([data, ...posts]);
      
      if (category === 'campus-update' && !data.isFlagged) {
        setUpdates((prev) => [data, ...prev].slice(0, 5));
      }

      setContent('');
      setImage(null);
      setCategory('general');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally { setPosting(false); }
  };

  const removePost = (id) => {
    setPosts(posts.filter(p => p._id !== id));
    setUpdates(updates.filter(u => u._id !== id));
  };

  const openStoryViewer = (index) => {
    setActiveUserStoryIdx(index);
    setActiveStoryIdx(0);
    markStoryAsViewed(groupedStories[index].stories[0]._id);
  };

  return (
    <div className="feed-layout">
      <main className="feed-main">
        {/* Stories Bar */}
        <div className="stories-bar card">
          <div className="story-circle-wrapper" onClick={() => setShowStoryOpts(true)}>
            <div className="story-avatar-container creator">
              <img
                src={getMediaUrl(user?.profilePhoto) || `https://ui-avatars.com/api/?name=${user?.username}&background=003087&color=fff`}
                alt=""
                className="story-avatar"
              />
              <div className="add-story-plus">
                <Plus size={10} strokeWidth={3} />
              </div>
            </div>
            <span className="story-label">Your Story</span>
          </div>

          {groupedStories.map((group, idx) => {
            const hasViewedAll = group.stories.every(s => s.views?.includes(user?._id));
            return (
              <div key={group.user?._id} onClick={() => openStoryViewer(idx)} className="story-circle-wrapper">
                <div className={`story-avatar-container ${hasViewedAll ? 'viewed' : 'unviewed'}`}>
                  <img
                    src={getMediaUrl(group.user?.profilePhoto) || `https://ui-avatars.com/api/?name=${group.user?.username}&background=003087&color=fff`}
                    alt=""
                    className="story-avatar"
                  />
                </div>
                <span className="story-label">@{group.user?.username}</span>
              </div>
            );
          })}
        </div>

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

      {/* Story Creation Options Modal */}
      {showStoryOpts && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '380px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Add to Story</h3>
              <button onClick={() => setShowStoryOpts(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setShowCamera(true); setShowStoryOpts(false); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                <Camera size={18} /> Use Camera
              </button>
              <label className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', cursor: 'pointer', textAlign: 'center' }}>
                <Upload size={18} /> Upload Photo/Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleUploadStoryFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeUserStoryIdx !== null && (
        <div className="story-viewer-overlay">
          <div className="story-viewer-container">
            {/* Top progress indicators */}
            <div className="story-progress-indicators">
              {groupedStories[activeUserStoryIdx].stories.map((s, sIdx) => {
                let fillWidth = '0%';
                if (sIdx < activeStoryIdx) fillWidth = '100%';
                
                return (
                  <div key={s._id} className="story-progress-bar">
                    <div 
                      className={`story-progress-fill ${sIdx === activeStoryIdx ? 'active' : ''}`}
                      style={{ width: sIdx === activeStoryIdx ? undefined : fillWidth }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header info */}
            <div className="story-viewer-header">
              <div className="story-viewer-author">
                <img
                  src={getMediaUrl(groupedStories[activeUserStoryIdx].user?.profilePhoto) || `https://ui-avatars.com/api/?name=${groupedStories[activeUserStoryIdx].user?.username}&background=003087&color=fff`}
                  alt=""
                  className="avatar"
                  width={32}
                  height={32}
                />
                <span className="story-viewer-username">@{groupedStories[activeUserStoryIdx].user?.username}</span>
                <span className="story-viewer-time">
                  {new Date(groupedStories[activeUserStoryIdx].stories[activeStoryIdx].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {((groupedStories[activeUserStoryIdx].user?._id === user?._id) || (user?.role === 'admin')) && (
                  <button 
                    onClick={() => handleDeleteStory(groupedStories[activeUserStoryIdx].stories[activeStoryIdx]._id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                    title="Delete Story"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={closeStoryViewer} className="story-viewer-close">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Media content */}
            <div className="story-viewer-media">
              {groupedStories[activeUserStoryIdx].stories[activeStoryIdx].mediaType === 'video' ? (
                <video
                  src={getMediaUrl(groupedStories[activeUserStoryIdx].stories[activeStoryIdx].mediaUrl)}
                  autoPlay
                  playsInline
                  controls={false}
                  className="story-media-element"
                />
              ) : (
                <img
                  src={getMediaUrl(groupedStories[activeUserStoryIdx].stories[activeStoryIdx].mediaUrl)}
                  alt=""
                  className="story-media-element"
                />
              )}
            </div>

            {/* Click navigation overlays */}
            <div className="story-click-left" onClick={prevStory} />
            <div className="story-click-right" onClick={nextStory} />

            {/* Arrows for non-touch desktops */}
            <button onClick={prevStory} className="story-arrow left-arrow">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextStory} className="story-arrow right-arrow">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCamera}
        mode="photo"
        onClose={() => setShowCamera(false)}
        onCapture={handleCaptureStory}
      />
    </div>
  );
}
