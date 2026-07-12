import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login    from './pages/Login';
import Register from './pages/Register';
import Feed     from './pages/Feed';
import Profile  from './pages/Profile';
import Search   from './pages/Search';
import Admin    from './pages/Admin';
import Notifications from './pages/Notifications';
import './index.css';

const AUTH_ROUTES = ['/login', '/register'];

function Layout() {
  const { user }   = useAuth();
  const location   = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  if (!user && !isAuthPage) return <Navigate to="/login" />;
  if (user && isAuthPage) return <Navigate to="/feed" />;

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '0 24px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/feed"          element={<Feed />} />
          <Route path="/profile/:id"   element={<Profile />} />
          <Route path="/search"        element={<Search />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin"         element={user?.role === 'admin' ? <Admin /> : <Navigate to="/feed" />} />
          <Route path="*"              element={<Navigate to="/feed" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
