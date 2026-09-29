import { createContext, useContext, useEffect, useState } from 'react';
import { adminLogin as apiAdminLogin, adminLoginVerify, getAdminMe } from '../api';
import useIdleLogout from '../lib/useIdleLogout';

const AdminAuthContext = createContext(null);

// There's no GET /admin/me on the backend — admin login already
// returns everything the UI needs, so the admin object is cached in
// localStorage alongside the token and restored from there on refresh,
// rather than re-fetched.
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('zappipay_admin');
    return stored ? JSON.parse(stored) : null;
  });

  // Refresh the role (OWNER / SUPPORT) — it can change after login.
  useEffect(() => {
    if (!admin) return;
    getAdminMe()
      .then((d) => {
        if (!d?.admin) return;
        const next = { ...admin, ...d.admin };
        if (next.role !== admin.role || next.name !== admin.name) {
          localStorage.setItem('zappipay_admin', JSON.stringify(next));
          setAdmin(next);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.id]);

  function finish(data) {
    localStorage.setItem('zappipay_admin_token', data.token);
    localStorage.setItem('zappipay_admin', JSON.stringify(data.admin));
    if (data.rememberToken) localStorage.setItem('zappipay_admin_remember', data.rememberToken);
    setAdmin(data.admin);
  }

  // Returns { twoFactor, challengeId, emailHint } when an email code is
  // needed; otherwise logs straight in.
  async function login(email, password) {
    const rememberToken = localStorage.getItem('zappipay_admin_remember') || undefined;
    const data = await apiAdminLogin({ email, password, rememberToken });
    if (data.twoFactor) return data;
    finish(data);
    return null;
  }

  async function verifyCode(challengeId, code, remember) {
    finish(await adminLoginVerify({ challengeId, code, remember }));
  }

  function logout() {
    localStorage.removeItem('zappipay_admin_token');
    localStorage.removeItem('zappipay_admin');
    setAdmin(null);
  }

  // Admin panel: 30 minutes without activity.
  useIdleLogout({ active: Boolean(admin), minutes: 30, kind: 'admin', onTimeout: () => { logout(); window.location.replace('/admin/login'); } });

  return (
    <AdminAuthContext.Provider value={{ admin, isOwner: (admin?.role || 'OWNER') !== 'SUPPORT', login, verifyCode, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider.');
  return ctx;
}
