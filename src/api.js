const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Customer and admin sessions are kept under separate localStorage keys
// so a staff member can be logged into the admin panel and a customer
// account in the same browser without one logging the other out.
export function request(path, options = {}) {
  const token = localStorage.getItem('zappipay_customer_token');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(handleResponse);
}

export function adminRequest(path, options = {}) {
  const token = localStorage.getItem('zappipay_admin_token');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(handleResponse);
}

// --- Customer auth ---
export const signup = (data) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) });
export const login = (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
export const getMe = () => request('/api/auth/me');

// --- Wallet ---
export const getWalletBalance = () => request('/api/wallet/balance');
export const getWalletTransactions = () => request('/api/wallet/transactions');
export const submitFundRequest = (data) => request('/api/wallet/fund-request', { method: 'POST', body: JSON.stringify(data) });

// --- VTpass ---
export const getVtpassCategories = () => request('/api/vtpass/categories');
export const getVtpassServices = (identifier) => request(`/api/vtpass/services?identifier=${encodeURIComponent(identifier)}`);
export const getVtpassVariations = (serviceID) => request(`/api/vtpass/variations?serviceID=${encodeURIComponent(serviceID)}`);
export const verifyBillersCode = (serviceID, billersCode, type) =>
  request(`/api/vtpass/verify?serviceID=${encodeURIComponent(serviceID)}&billersCode=${encodeURIComponent(billersCode)}${type ? `&type=${type}` : ''}`);
export const purchase = (data) => request('/api/vtpass/purchase', { method: 'POST', body: JSON.stringify(data) });
export const getOrders = () => request('/api/orders');

// --- Admin auth ---
export const adminLogin = (data) => adminRequest('/api/admin/login', { method: 'POST', body: JSON.stringify(data) });

// --- Admin: settings ---
export const getSettings = () => adminRequest('/api/admin/settings');
export const updateSettings = (data) => adminRequest('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(data) });

// --- Admin: customers ---
export const getCustomers = () => adminRequest('/api/admin/customers');
export const setCustomerActive = (id, active) =>
  adminRequest(`/api/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });

// --- Admin: wallet approvals ---
export const getPendingFunding = () => adminRequest('/api/admin/wallet/pending');
export const approveFunding = (id) => adminRequest(`/api/admin/wallet/${id}/approve`, { method: 'POST' });
export const rejectFunding = (id) => adminRequest(`/api/admin/wallet/${id}/reject`, { method: 'POST' });

// --- Admin: orders & audit log ---
export const getAdminOrders = () => adminRequest('/api/admin/orders');
export const getAuditLog = () => adminRequest('/api/admin/audit-log');
