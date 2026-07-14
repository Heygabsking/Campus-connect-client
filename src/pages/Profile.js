import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import { Download, UserPlus, UserCheck, Edit, LogOut } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { id }                                = useParams();
  const { user: me, updateUserState, logout } = useAuth();
  const navigate                              = useNavigate();
  const [profile, setProfile]         = useState(null);
  const [posts, setPosts]             = useState([]);
  const [following, setFollowing]     = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading]         = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  const [editPhoto, setEditPhoto] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [removePhotoFlag, setRemovePhotoFlag] = useState(false);

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalTitle, setUsersModalTitle] = useState('');
  const [usersList, setUsersList] = useState([]);

  const handleShowUsersList = (type) => {
    if (!profile) return;
    if (type === 'followers') {
      setUsersModalTitle('Followers');
      setUsersList(profile.followers || []);
    } else {
      setUsersModalTitle('Following');
      setUsersList(profile.following || []);
    }
    setShowUsersModal(true);
  };

  const isMe = id === me?._id;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [{ data: p }, { data: ps }] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/posts/user/${id}`),
        ]);
        setProfile(p);
        setPosts(ps);
        setFollowing(p.followers?.some(f => (f._id || f) === me?._id));
        setFollowerCount(p.followers?.length || 0);
        setEditForm({ username: p.username || '', bio: p.bio || '' });
      } catch { toast.error('Failed to load profile'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, me?._id]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('username', editForm.username);
      formData.append('bio', editForm.bio);
      if (editPhoto) formData.append('profilePhoto', editPhoto);
      if (removePhotoFlag) formData.append('removePhoto', 'true');

      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setProfile((prev) => ({ ...prev, ...data }));
      updateUserState(data);
      toast.success('Profile updated');
      setShowEdit(false);
      setEditPhoto(null);
      setRemovePhotoFlag(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const { data } = await api.put(`/users/${id}/follow`);
      setFollowing(data.following);
      setFollowerCount(data.followerCount);
      const { data: updatedProfile } = await api.get(`/users/${id}`);
      setProfile(updatedProfile);
      setFollowing(updatedProfile.followers?.some(f => (f._id || f) === me?._id));
    } catch { toast.error('Failed'); }
  };

  const downloadReport = () => {
    window.open(`http://localhost:5001/api/users/${id}/report`, '_blank');
  };

  const removePost = (pid) => setPosts(posts.filter(p => p._id !== pid));

  if (loading) return <div className="profile-loading">Loading…</div>;
  if (!profile) return <div className="profile-loading">User not found</div>;

  return (
    <div className="profile-page page-fade-in">
      <div className="profile-card card">
        <div className="profile-banner" />
        <div className="profile-info">
          <img
            src={getMediaUrl(profile.profilePhoto) || `https://ui-avatars.com/api/?name=${profile.username}&background=003087&color=fff&size=100`}
            alt="" className="avatar profile-avatar"
          />
          <div className="profile-details">
            <h2>@{profile.username}</h2>
            <p className="profile-bio">{profile.bio || 'No bio yet.'}</p>
            <div className="profile-stats">
              <span><strong>{posts.length}</strong> posts</span>
              <span onClick={() => handleShowUsersList('followers')} style={{ cursor: 'pointer' }}><strong>{followerCount}</strong> followers</span>
              <span onClick={() => handleShowUsersList('following')} style={{ cursor: 'pointer' }}><strong>{profile.following?.length || 0}</strong> following</span>
            </div>
          </div>
          <div className="profile-cta">
            {isMe ? (
              <>
                <button onClick={() => setShowEdit(true)} className="btn-outline">
                  <Edit size={15} /> Edit Profile
                </button>
                <button onClick={() => { logout(); navigate('/login'); }} className="btn-outline btn-logout" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Log out">
                  <LogOut size={15} /> Log Out
                </button>
              </>
            ) : (
              <button onClick={toggleFollow} className={following ? 'btn-outline' : 'btn-primary'}>
                {following ? <><UserCheck size={15} /> Following</> : <><UserPlus size={15} /> Follow</>}
              </button>
            )}
            <button onClick={downloadReport} className="btn-outline" title="Download PDF report">
              <Download size={15} /> Report
            </button>
          </div>
        </div>
      </div>

      <div className="profile-posts">
        <h3 className="posts-heading">Posts</h3>
        {posts.length === 0
          ? <p className="no-posts">No posts yet.</p>
          : posts.map(p => <PostCard key={p._id} post={p} onDelete={removePost} />)
        }
      </div>

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3 className="modal-title">Edit Profile</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Profile Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => { setEditPhoto(e.target.files[0]); setRemovePhotoFlag(false); }} 
                  style={{ border: '1.5px dashed var(--border)', padding: 12, width: '100%', borderRadius: 8 }}
                />
                {editPhoto && <span className="file-name-hint">{editPhoto.name}</span>}
                {profile.profilePhoto && !removePhotoFlag && (
                  <button
                    type="button"
                    onClick={() => { setRemovePhotoFlag(true); setEditPhoto(null); }}
                    className="btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginTop: 8, padding: '6px 12px', fontSize: '12px', width: '100%' }}
                  >
                    Remove Current Photo
                  </button>
                )}
                {removePhotoFlag && (
                  <span className="file-name-hint" style={{ color: 'var(--danger)', display: 'block', marginTop: 6, fontWeight: 'bold' }}>
                    Photo will be removed on save
                  </span>
                )}
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Username</label>
                <input 
                  value={editForm.username} 
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} 
                  required 
                  style={{ width: '100%', borderRadius: 8, padding: 10 }}
                />
              </div>
              <div className="field" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Bio</label>
                <textarea 
                  value={editForm.bio} 
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} 
                  rows={3}
                  style={{ width: '100%', borderRadius: 8, padding: 10, resize: 'none' }}
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-outline" onClick={() => { setShowEdit(false); setEditPhoto(null); }} disabled={updating}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUsersModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowUsersModal(false); }}>
          <div className="modal-content card" style={{ maxWidth: '400px', maxHeight: '75vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>{usersModalTitle}</h3>
              <button onClick={() => setShowUsersModal(false)} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text)' }}>
                &times;
              </button>
            </div>
            
            <div className="users-list-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usersList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', margin: '20px 0' }}>
                  No {usersModalTitle.toLowerCase()} yet.
                </p>
              ) : (
                usersList.map((u) => (
                  <div 
                    key={u._id} 
                    onClick={() => {
                      setShowUsersModal(false);
                      navigate(`/profile/${u._id}`);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '8px 10px', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    className="user-list-item"
                  >
                    <img
                      src={getMediaUrl(u.profilePhoto) || `https://ui-avatars.com/api/?name=${u.username}&background=003087&color=fff`}
                      alt="" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>
                      @{u.username}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
