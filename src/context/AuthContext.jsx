import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, signup as apiSignup, getMe } from '../api';
import { getQuickLogin, isUnlocked, markUnlocked, clearUnlocked, saveQuickLogin } from '../lib/quickLogin';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // With quick login on, a fresh app open always asks for PIN /
    // fingerprint — the saved session is dropped until they unlock.
    if (getQuickLogin() && !isUnlocked()) {
      localStorage.removeItem('zappipay_customer_token');
    }
    const token = localStorage.getItem('zappipay_customer_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((data) => setCustomer(data.customer))
      .catch(() => localStorage.removeItem('zappipay_customer_token'))
      .finally(() => setLoading(false));
  }, []);

  function startSession(data) {
    localStorage.setItem('zappipay_customer_token', data.token);
    markUnlocked();
    setCustomer(data.customer);
    if (getQuickLogin()) {
      saveQuickLogin({ name: data.customer.name, avatarUrl: data.customer.avatarUrl || null });
    }
  }

  async function login(identifier, password) {
    const data = await apiLogin({ identifier, password });
    startSession(data);
  }

  async function signup(payload) {
    const data = await apiSignup(payload);
    startSession(data);
  }

  function logout() {
    // Quick-login details stay, so next time it's just PIN / fingerprint.
    localStorage.removeItem('zappipay_customer_token');
    clearUnlocked();
    setCustomer(null);
  }

  // Called after a wallet fund/purchase so the balance shown in the UI
  // stays in sync without a full page reload.
  function refreshCustomer() {
    return getMe().then((data) => setCustomer(data.customer));
  }

  return (
    <AuthContext.Provider value={{ customer, loading, login, signup, logout, refreshCustomer, startSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
