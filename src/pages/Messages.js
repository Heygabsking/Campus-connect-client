/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { Send, Image, Video, Mic, Square, Trash2, Search, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../utils/api';
import toast from 'react-hot-toast';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  
  // Chats & Messages states
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Voice Note Recorder states
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [mediaFile, setMediaFile] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      const { data } = await api.get('/chats');
      setChats(data);
      if (data.length > 0) {
        setActiveChat(data[0]);
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/chats/${chatId}/messages`);
      setMessages(data);
    } catch {
      toast.error('Failed to load messages');
    }
  };

  const handleSearchUsers = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await api.get(`/users/search?q=${q}`);
      // Filter out self
      setSearchResults(data.filter(u => u._id !== user._id));
    } catch {
      // silent fail
    }
  };

  const startNewChat = async (recipientId) => {
    try {
      const { data } = await api.post('/chats/find-or-create', { recipientId });
      // Add if not already in chats
      if (!chats.some(c => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      setActiveChat(data);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      toast.error('Could not start conversation');
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setVoiceSeconds(0);
      setVoiceBlob(null);

      recordingTimerRef.current = setInterval(() => {
        setVoiceSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelVoiceNote = () => {
    setVoiceBlob(null);
    setVoiceSeconds(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && !mediaFile && !voiceBlob) return;
    if (!activeChat) return;

    setSendingMessage(true);
    try {
      const form = new FormData();
      form.append('chatId', activeChat._id);
      if (text.trim()) form.append('text', text);
      
      if (mediaFile) {
        form.append('media', mediaFile);
      } else if (voiceBlob) {
        const audioFile = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        form.append('media', audioFile);
      }

      const { data } = await api.post('/chats/message', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => [...prev, data]);
      setText('');
      setMediaFile(null);
      setVoiceBlob(null);
      setVoiceSeconds(0);

      // Prepend or update chat list order
      setChats(prev => {
        const remaining = prev.filter(c => c._id !== activeChat._id);
        const updatedChat = { ...activeChat, lastMessage: data };
        return [updatedChat, ...remaining];
      });
    } catch (err) {
      toast.error('Message failed to send');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getRecipientUser = (c) => {
    return c.participants?.find(p => p._id !== user?._id);
  };

  return (
    <div className={`messages-page page-fade-in ${activeChat ? 'chat-active' : ''}`}>
      {/* Chats Sidebar */}
      <div className="messages-sidebar card">
        <div className="sidebar-header">
          <h2>Private Chats</h2>
          <button onClick={() => setShowSearch(true)} className="btn-primary start-chat-btn" title="New Message">
            <Search size={15} /> Search Student
          </button>
        </div>

        <div className="conversations-list">
          {loading ? (
            <p className="no-conversations">Loading conversations...</p>
          ) : chats.length === 0 ? (
            <p className="no-conversations">No active chats. Search for a student to begin chatting!</p>
          ) : (
            chats.map(c => {
              const other = getRecipientUser(c);
              const isActive = activeChat?._id === c._id;
              if (!other) return null;
              
              return (
                <div 
                  key={c._id} 
                  onClick={() => setActiveChat(c)}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                >
                  <img
                    src={getMediaUrl(other.profilePhoto) || `https://ui-avatars.com/api/?name=${other.username}&background=003087&color=fff`}
                    alt="" className="avatar" width={40} height={40}
                  />
                  <div className="convo-info">
                    <div className="convo-header">
                      <span className="convo-username">@{other.username}</span>
                    </div>
                    {c.lastMessage && (
                      <p className="convo-snippet">
                        {c.lastMessage.sender?._id === user?._id ? 'You: ' : ''}
                        {c.lastMessage.mediaType !== 'text' ? `📷 sent a ${c.lastMessage.mediaType}` : c.lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Messaging Window */}
      <div className="messages-window card">
        {activeChat ? (
          <>
            {/* Window Header */}
            <div className="window-header">
              <button 
                type="button" 
                onClick={() => setActiveChat(null)} 
                className="chat-back-btn"
                title="Back to inbox"
              >
                <ChevronLeft size={22} />
              </button>
              <img
                src={getMediaUrl(getRecipientUser(activeChat)?.profilePhoto) || `https://ui-avatars.com/api/?name=${getRecipientUser(activeChat)?.username}&background=003087&color=fff`}
                alt="" className="avatar" width={38} height={38}
              />
              <span className="window-username">@{getRecipientUser(activeChat)?.username}</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="messages-body">
              {messages.map((m) => {
                const isSentByMe = m.sender?._id === user?._id;
                return (
                  <div key={m._id} className={`message-bubble-wrapper ${isSentByMe ? 'sent' : 'received'}`}>
                    {!isSentByMe && (
                      <img
                        src={getMediaUrl(m.sender?.profilePhoto) || `https://ui-avatars.com/api/?name=${m.sender?.username}&background=003087&color=fff`}
                        alt="" className="avatar message-bubble-avatar" width={28} height={28}
                      />
                    )}
                    <div className="bubble-content-block">
                      <div className="message-bubble">
                        {/* Media rendering */}
                        {m.mediaType === 'image' && (
                          <img src={getMediaUrl(m.mediaUrl)} alt="Attachment" className="chat-media-image" />
                        )}
                        {m.mediaType === 'video' && (
                          <video src={getMediaUrl(m.mediaUrl)} controls className="chat-media-video" />
                        )}
                        {m.mediaType === 'audio' && (
                          <audio src={getMediaUrl(m.mediaUrl)} controls className="chat-media-audio" />
                        )}
                        {m.text && <p className="bubble-text">{m.text}</p>}
                      </div>
                      <span className="bubble-time">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Input Footer */}
            <div className="window-footer">
              {mediaFile && (
                <div className="attachment-preview">
                  <span>📎 File: {mediaFile.name}</span>
                  <button onClick={() => setMediaFile(null)} className="close-btn"><X size={14} /></button>
                </div>
              )}

              {voiceBlob && (
                <div className="attachment-preview audio-preview">
                  <span>🎙️ Voice Note Preview ({formatTime(voiceSeconds)})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={cancelVoiceNote} className="close-btn" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="input-form">
                {/* File uploads */}
                <div className="upload-options">
                  <label className="attachment-label" title="Attach Image">
                    <Image size={18} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => { setMediaFile(e.target.files[0]); setVoiceBlob(null); }} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  <label className="attachment-label" title="Attach Video">
                    <Video size={18} />
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={e => { setMediaFile(e.target.files[0]); setVoiceBlob(null); }} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={recording ? "Recording audio note..." : "Type a message..."}
                  disabled={recording || voiceBlob}
                  rows={1}
                />

                {/* Voice Note controls */}
                {!recording ? (
                  !voiceBlob && (
                    <button 
                      type="button" 
                      onClick={startRecording} 
                      className="control-btn voice-note-btn"
                      title="Record voice note"
                    >
                      <Mic size={18} />
                    </button>
                  )
                ) : (
                  <button 
                    type="button" 
                    onClick={stopRecording} 
                    className="control-btn voice-note-btn recording"
                    title="Stop recording"
                  >
                    <Square size={18} />
                  </button>
                )}

                <button 
                  type="submit" 
                  className="btn-primary send-btn" 
                  disabled={sendingMessage || (!text.trim() && !mediaFile && !voiceBlob)}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-window">
            <h3>Select a student conversation to start chatting</h3>
            <p>Or click "Search Student" to find a classmate and start private messaging.</p>
          </div>
        )}
      </div>

      {/* New Chat Search Modal */}
      {showSearch && (
        <div className="modal-overlay">
          <div className="modal-content card messages-search-modal">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Search Student</h3>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="close-btn"><X size={20} /></button>
            </div>
            
            <div className="search-bar-wrapper">
              <input
                value={searchQuery}
                onChange={handleSearchUsers}
                placeholder="Type student username..."
                autoFocus
              />
            </div>

            <div className="search-results-list">
              {searchResults.length === 0 ? (
                searchQuery ? <p className="no-results">No students found</p> : null
              ) : (
                searchResults.map(u => (
                  <div key={u._id} onClick={() => startNewChat(u._id)} className="search-user-row">
                    <img
                      src={getMediaUrl(u.profilePhoto) || `https://ui-avatars.com/api/?name=${u.username}&background=003087&color=fff`}
                      alt="" className="avatar" width={32} height={32}
                    />
                    <span className="search-username">@{u.username}</span>
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
