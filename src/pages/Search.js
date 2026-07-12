import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Search as SearchIcon } from 'lucide-react';
import './Search.css';

export default function Search() {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${q}`);
      setResults(data);
    } finally { setLoading(false); }
  };

  return (
    <div className="search-page page-fade-in">
      <div className="search-box card">
        <div className="search-input-wrap">
          <SearchIcon size={18} className="search-icon" />
          <input
            value={query} onChange={handleSearch}
            placeholder="Search students by username…"
            className="search-input"
          />
        </div>
      </div>

      {loading && <p className="search-status">Searching…</p>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map(u => (
            <Link to={`/profile/${u._id}`} key={u._id} className="user-result card">
              <img
                src={u.profilePhoto || `https://ui-avatars.com/api/?name=${u.username}&background=003087&color=fff`}
                alt="" className="avatar" width={44} height={44}
              />
              <div>
                <p className="result-username">@{u.username}</p>
                <p className="result-bio">{u.bio || 'USIU-Africa student'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="search-status">No students found for "{query}"</p>
      )}
    </div>
  );
}
