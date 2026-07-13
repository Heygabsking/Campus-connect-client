/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Upload, Plus, X, Search, FileText, Download, Edit2, Trash2 } from 'lucide-react';
import api, { getMediaUrl } from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Lecturers.css';

export default function Lecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user } = useAuth();
  const [showEditLecturer, setShowEditLecturer] = useState(false);
  const [editLecturerData, setEditLecturerData] = useState({ _id: '', name: '', department: '' });

  // Modals
  const [showAddLecturer, setShowAddLecturer] = useState(false);
  const [newLecturer, setNewLecturer] = useState({ name: '', department: 'Chandaria School Of Business' });
  const [activeLecturerDetails, setActiveDetails] = useState(null);
  
  // Review creation form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, recommend: true, comment: '', courseCode: '' });

  // Review editing form
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, recommend: true, comment: '', courseCode: '' });

  // Past paper upload form
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [paperForm, setPaperForm] = useState({ courseCode: '', file: null });
  const [uploadingPaper, setUploadingPaper] = useState(false);

  useEffect(() => {
    fetchLecturers();
  }, [searchQuery]);

  const fetchLecturers = async () => {
    try {
      const { data } = await api.get(`/lecturers?q=${searchQuery}`);
      setLecturers(data);
    } catch {
      toast.error('Failed to load lecturers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLecturer = async (e) => {
    e.preventDefault();
    if (!newLecturer.name || !newLecturer.department) return;
    try {
      const { data } = await api.post('/lecturers', newLecturer);
      setLecturers([data, ...lecturers]);
      toast.success('Lecturer profile created');
      setShowAddLecturer(false);
      setNewLecturer({ name: '', department: 'Chandaria School Of Business' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create profile');
    }
  };

  const fetchLecturerDetails = async (id) => {
    try {
      const { data } = await api.get(`/lecturers/${id}`);
      setActiveDetails(data);
    } catch {
      toast.error('Failed to load lecturer profile');
    }
  };

  const handleDeleteLecturer = async (lecturerId) => {
    if (!window.confirm("Are you sure you want to delete this lecturer profile? This will also delete all reviews and past papers for this lecturer.")) return;
    try {
      await api.delete(`/lecturers/${lecturerId}`);
      toast.success('Lecturer profile deleted');
      setLecturers(prev => prev.filter(l => l._id !== lecturerId));
      setActiveDetails(null);
    } catch (err) {
      toast.error('Failed to delete profile');
    }
  };

  const handleOpenEdit = (lecturer) => {
    setEditLecturerData({
      _id: lecturer._id,
      name: lecturer.name,
      department: lecturer.department
    });
    setShowEditLecturer(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/lecturers/${editLecturerData._id}`, {
        name: editLecturerData.name,
        department: editLecturerData.department
      });
      toast.success('Lecturer profile updated');
      
      // Update local list
      setLecturers(prev => prev.map(l => l._id === data._id ? { ...l, name: data.name, department: data.department } : l));
      
      // Update active details
      if (activeLecturerDetails && activeLecturerDetails.lecturer._id === data._id) {
        setActiveDetails(prev => ({
          ...prev,
          lecturer: data
        }));
      }
      
      setShowEditLecturer(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete your review?")) return;
    try {
      await api.delete(`/lecturers/review/${reviewId}`);
      toast.success('Review deleted');
      
      if (activeLecturerDetails) {
        fetchLecturerDetails(activeLecturerDetails.lecturer._id);
      }
      fetchLecturers();
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  const handleOpenEditReview = (r) => {
    setEditingReviewId(r._id);
    setEditReviewForm({
      rating: r.rating,
      recommend: r.recommend,
      comment: r.comment,
      courseCode: r.courseCode
    });
  };

  const handleSaveEditReview = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/lecturers/review/${editingReviewId}`, editReviewForm);
      toast.success('Review updated');
      setEditingReviewId(null);
      
      if (activeLecturerDetails) {
        fetchLecturerDetails(activeLecturerDetails.lecturer._id);
      }
      fetchLecturers();
    } catch (err) {
      toast.error('Failed to update review');
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment || !reviewForm.courseCode) return;
    try {
      const { data } = await api.post(`/lecturers/${activeLecturerDetails.lecturer._id}/reviews`, reviewForm);
      
      // Update local details state
      setActiveDetails(prev => {
        const updatedReviews = [data, ...prev.reviews];
        const total = updatedReviews.length;
        const avg = (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);
        const recommendPercent = Math.round((updatedReviews.filter(r => r.recommend).length / total) * 100);
        return {
          ...prev,
          reviews: updatedReviews,
          averageRating: Number(avg),
          recommendPercentage: recommendPercent,
          totalReviews: total
        };
      });

      toast.success('Review posted successfully');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, recommend: true, comment: '', courseCode: '' });
      // Re-fetch summaries
      fetchLecturers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post review');
    }
  };

  const handleUploadPaper = async (e) => {
    e.preventDefault();
    if (!paperForm.file || !paperForm.courseCode) return;
    
    setUploadingPaper(true);
    try {
      const form = new FormData();
      form.append('paper', paperForm.file);
      form.append('courseCode', paperForm.courseCode);

      const { data } = await api.post(`/lecturers/${activeLecturerDetails.lecturer._id}/papers`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setActiveDetails(prev => ({
        ...prev,
        pastPapers: [data, ...prev.pastPapers]
      }));

      toast.success('Past paper uploaded successfully');
      setShowPaperForm(false);
      setPaperForm({ courseCode: '', file: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingPaper(false);
    }
  };

  return (
    <div className="lecturers-page page-fade-in">
      <div className="lecturers-header card">
        <div className="header-info">
          <h1> Lecturer Reviews & Past Papers</h1>
          <p>Get guidance from peers and browse study resources</p>
        </div>
        <button onClick={() => setShowAddLecturer(true)} className="btn-primary add-lecturer-trigger">
          <Plus size={16} /> Add Lecturer
        </button>
      </div>

      {/* Search Bar */}
      <div className="lecturer-search-wrap card">
        <Search size={18} className="search-icon" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search lecturer by name..."
        />
      </div>

      {/* Grid of Lecturers */}
      {loading ? (
        <div className="lecturers-loading">Loading directory...</div>
      ) : lecturers.length === 0 ? (
        <div className="lecturers-empty card">
          <h3>No lecturer profiles found</h3>
          <p>Be the first to add a lecturer profile and review them!</p>
        </div>
      ) : (
        <div className="lecturers-grid">
          {lecturers.map(l => (
            <div key={l._id} onClick={() => fetchLecturerDetails(l._id)} className="lecturer-card card">
              <h3>{l.name}</h3>
              <p className="dept-tag">{l.department}</p>
              
              <div className="lecturer-card-rating">
                <div className="rating-stars">
                  <Star size={16} fill="var(--accent)" color="var(--accent)" />
                  <span>{l.averageRating > 0 ? l.averageRating : 'No ratings'}</span>
                </div>
                {l.totalReviews > 0 && (
                  <span className="recommend-percent">
                    👍 {l.recommendPercentage}% recommend
                  </span>
                )}
              </div>
              <span className="reviews-count-hint">{l.totalReviews} student reviews</span>
            </div>
          ))}
        </div>
      )}

      {/* Lecturer Profile Detail Modal */}
      {activeLecturerDetails && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveDetails(null); }}>
          <div className="modal-content card lecturer-details-modal">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2>{activeLecturerDetails.lecturer.name}</h2>
              <button onClick={() => setActiveDetails(null)} className="close-btn"><X size={20} /></button>
            </div>
            <p className="dept-label">{activeLecturerDetails.lecturer.department}</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', marginTop: '-8px' }}>
              <button 
                onClick={() => handleOpenEdit(activeLecturerDetails.lecturer)} 
                className="btn-outline" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Edit Profile
              </button>
              <button 
                onClick={() => handleDeleteLecturer(activeLecturerDetails.lecturer._id)} 
                className="btn-outline" 
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Delete Profile
              </button>
            </div>

            <div className="rating-summary-row card">
              <div className="summary-col">
                <span className="summary-number">{activeLecturerDetails.averageRating > 0 ? `${activeLecturerDetails.averageRating} / 5` : 'N/A'}</span>
                <span className="summary-label">Average Rating</span>
              </div>
              <div className="summary-col">
                <span className="summary-number">{activeLecturerDetails.recommendPercentage}%</span>
                <span className="summary-label">Would Recommend</span>
              </div>
              <div className="summary-col">
                <span className="summary-number">{activeLecturerDetails.totalReviews}</span>
                <span className="summary-label">Total Reviews</span>
              </div>
            </div>

            {/* Actions */}
            <div className="lecturer-action-buttons">
              <button onClick={() => setShowReviewForm(true)} className="btn-primary">
                Write a Review
              </button>
              <button onClick={() => setShowPaperForm(true)} className="btn-outline">
                <Upload size={14} /> Upload Past Paper
              </button>
            </div>

            {/* Dual Tabs (Reviews & Past Papers) */}
            <div className="tabs-container">
              <div className="tab-section">
                <h3>Reviews ({activeLecturerDetails.reviews.length})</h3>
                <div className="reviews-list">
                  {activeLecturerDetails.reviews.length === 0 ? (
                    <p className="no-resource-placeholder">No reviews posted yet. Be the first to help others!</p>
                  ) : (
                    activeLecturerDetails.reviews.map(r => (
                      <div key={r._id} className="review-item card">
                        <div className="review-header">
                          <img
                            src={getMediaUrl(r.student?.profilePhoto) || `https://ui-avatars.com/api/?name=${r.student?.username}&background=003087&color=fff`}
                            alt="" className="avatar" width={28} height={28}
                          />
                          <div className="review-author-info">
                            <span className="review-username">@{r.student?.username}</span>
                            <span className="review-course-code">Course: {r.courseCode}</span>
                          </div>
                          {(r.student?._id === user?._id || user?.role === 'admin') && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', marginRight: '8px' }}>
                              <button 
                                type="button"
                                onClick={() => handleOpenEditReview(r)} 
                                className="close-btn" 
                                title="Edit Review"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #8e8e8e)', display: 'flex', padding: 4 }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteReview(r._id)} 
                                className="close-btn" 
                                title="Delete Review"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger, #e03c3c)', display: 'flex', padding: 4 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                          <div className="review-rating-badge">
                            <Star size={12} fill="var(--accent)" color="var(--accent)" />
                            <span>{r.rating}</span>
                          </div>
                        </div>
                        <p className="review-text">{r.comment}</p>
                        <span className="recommendation-badge">
                          {r.recommend ? (
                            <span className="rec-yes"><ThumbsUp size={12} /> Recommends</span>
                          ) : (
                            <span className="rec-no"><ThumbsDown size={12} /> Does not recommend</span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="tab-section" style={{ marginTop: '24px' }}>
                <h3>Past Papers ({activeLecturerDetails.pastPapers.length})</h3>
                <div className="papers-list">
                  {activeLecturerDetails.pastPapers.length === 0 ? (
                    <p className="no-resource-placeholder">No past papers uploaded yet for this lecturer.</p>
                  ) : (
                    activeLecturerDetails.pastPapers.map(p => (
                      <div key={p._id} className="paper-item card">
                        <div className="paper-item-left">
                          <FileText size={20} className="paper-icon" />
                          <div className="paper-details">
                            <span className="paper-course">{p.courseCode} Exam Paper</span>
                            <span className="paper-filename">{p.fileName}</span>
                            <span className="paper-uploader">Uploaded by @{p.uploadedBy?.username}</span>
                          </div>
                        </div>
                        <a href={getMediaUrl(p.fileUrl)} target="_blank" rel="noreferrer" className="download-btn-link" title="Open/Download Paper">
                          <Download size={16} />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lecturer Modal */}
      {showAddLecturer && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddLecturer(false); }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Add Lecturer Profile</h3>
              <button onClick={() => setShowAddLecturer(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddLecturer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Lecturer Name</label>
                <input
                  value={newLecturer.name}
                  onChange={e => setNewLecturer({ ...newLecturer, name: e.target.value })}
                  placeholder="e.g. Dr. John Doe"
                  required
                />
              </div>
              <div className="field">
                <label>Department</label>
                <select
                  value={newLecturer.department}
                  onChange={e => setNewLecturer({ ...newLecturer, department: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                >
                  <option value="Chandaria School Of Business">Chandaria School Of Business</option>
                  <option value="School of Science and Technology">School of Science and Technology</option>
                  <option value="School of Humanities and Social Sciences">School of Humanities and Social Sciences</option>
                  <option value="School of Communication and Creative Arts">School of Communication and Creative Arts</option>
                  <option value="School of Pharmacy and Health Sciences">School of Pharmacy and Health Sciences</option>
                  <option value="School of Graduate Studies">School of Graduate Studies</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Add Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      {showReviewForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewForm(false); }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Write a Review</h3>
              <button onClick={() => setShowReviewForm(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Course Code</label>
                <input
                  value={reviewForm.courseCode}
                  onChange={e => setReviewForm({ ...reviewForm, courseCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. APT 3040"
                  required
                />
              </div>
              <div className="field">
                <label>Rating (1 - 5 Stars)</label>
                <select
                  value={reviewForm.rating}
                  onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                >
                  <option value={5}>5 Stars (Excellent)</option>
                  <option value={4}>4 Stars (Good)</option>
                  <option value={3}>3 Stars (Average)</option>
                  <option value={2}>2 Stars (Poor)</option>
                  <option value={1}>1 Star (Terrible)</option>
                </select>
              </div>
              <div className="field">
                <label style={{ display: 'block', marginBottom: '6px' }}>Would you recommend this lecturer?</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={reviewForm.recommend === true}
                      onChange={() => setReviewForm({ ...reviewForm, recommend: true })}
                      style={{ width: 'auto' }}
                    />
                    Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={reviewForm.recommend === false}
                      onChange={() => setReviewForm({ ...reviewForm, recommend: false })}
                      style={{ width: 'auto' }}
                    />
                    No
                  </label>
                </div>
              </div>
              <div className="field">
                <label>Your Feedback / Guidance</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details about their grading, teaching style, attendance, exams..."
                  rows={4}
                  required
                  style={{ resize: 'none' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Past Paper Modal */}
      {showPaperForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPaperForm(false); }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Upload Past Paper</h3>
              <button onClick={() => setShowPaperForm(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleUploadPaper} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Course Code</label>
                <input
                  value={paperForm.courseCode}
                  onChange={e => setPaperForm({ ...paperForm, courseCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. MTH 1010"
                  required
                />
              </div>
              <div className="field">
                <label>Choose File (PDF, DOCX, or Image)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,image/*"
                  onChange={e => setPaperForm({ ...paperForm, file: e.target.files[0] })}
                  required
                  style={{ border: '1.5px dashed var(--border)', padding: 12, borderRadius: 8, width: '100%' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={uploadingPaper}>
                {uploadingPaper ? 'Uploading...' : 'Upload Paper'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Lecturer Modal */}
      {showEditLecturer && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditLecturer(false); }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Edit Lecturer Profile</h3>
              <button onClick={() => setShowEditLecturer(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Lecturer Name</label>
                <input
                  value={editLecturerData.name}
                  onChange={e => setEditLecturerData({ ...editLecturerData, name: e.target.value })}
                  placeholder="e.g. Dr. John Doe"
                  required
                />
              </div>
              <div className="field">
                <label>Department</label>
                <select
                  value={editLecturerData.department}
                  onChange={e => setEditLecturerData({ ...editLecturerData, department: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                >
                  <option value="Chandaria School Of Business">Chandaria School Of Business</option>
                  <option value="School of Science and Technology">School of Science and Technology</option>
                  <option value="School of Humanities and Social Sciences">School of Humanities and Social Sciences</option>
                  <option value="School of Communication and Creative Arts">School of Communication and Creative Arts</option>
                  <option value="School of Pharmacy and Health Sciences">School of Pharmacy and Health Sciences</option>
                  <option value="School of Graduate Studies">School of Graduate Studies</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReviewId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingReviewId(null); }}>
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Edit Review</h3>
              <button onClick={() => setEditingReviewId(null)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEditReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Course Code</label>
                <input
                  value={editReviewForm.courseCode}
                  onChange={e => setEditReviewForm({ ...editReviewForm, courseCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. APT 3040"
                  required
                />
              </div>
              <div className="field">
                <label>Rating (1 - 5 Stars)</label>
                <select
                  value={editReviewForm.rating}
                  onChange={e => setEditReviewForm({ ...editReviewForm, rating: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                >
                  <option value={5}>5 Stars (Excellent)</option>
                  <option value={4}>4 Stars (Good)</option>
                  <option value={3}>3 Stars (Average)</option>
                  <option value={2}>2 Stars (Poor)</option>
                  <option value={1}>1 Star (Terrible)</option>
                </select>
              </div>
              <div className="field">
                <label style={{ display: 'block', marginBottom: '6px' }}>Would you recommend this lecturer?</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={editReviewForm.recommend === true}
                      onChange={() => setEditReviewForm({ ...editReviewForm, recommend: true })}
                      style={{ width: 'auto' }}
                    />
                    Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={editReviewForm.recommend === false}
                      onChange={() => setEditReviewForm({ ...editReviewForm, recommend: false })}
                      style={{ width: 'auto' }}
                    />
                    No
                  </label>
                </div>
              </div>
              <div className="field">
                <label>Your Feedback / Guidance</label>
                <textarea
                  value={editReviewForm.comment}
                  onChange={e => setEditReviewForm({ ...editReviewForm, comment: e.target.value })}
                  placeholder="Share details about their grading, teaching style, attendance, exams..."
                  rows={4}
                  required
                  style={{ resize: 'none' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Save Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
