import { createContext, useContext, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ccUser') || 'null'));

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ccUser', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (email, username, password, role) => {
    const { data } = await api.post('/auth/register', { email, username, password, role });
    localStorage.setItem('ccUser', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ccUser');
    setUser(null);
  };

  const updateUserState = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('ccUser', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
