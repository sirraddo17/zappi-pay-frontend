import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, signup as apiSignup, getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  async function login(phone, password) {
    const data = await apiLogin({ phone, password });
    localStorage.setItem('zappipay_customer_token', data.token);
    setCustomer(data.customer);
  }

  async function signup(payload) {
    const data = await apiSignup(payload);
    localStorage.setItem('zappipay_customer_token', data.token);
    setCustomer(data.customer);
  }

  function logout() {
    localStorage.removeItem('zappipay_customer_token');
    setCustomer(null);
  }

  // Called after a wallet fund/purchase so the balance shown in the UI
  // stays in sync without a full page reload.
  function refreshCustomer() {
    return getMe().then((data) => setCustomer(data.customer));
  }

  return (
    <AuthContext.Provider value={{ customer, loading, login, signup, logout, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
