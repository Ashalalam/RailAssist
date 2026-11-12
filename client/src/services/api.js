export const getApiBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (isLocal) {
      return 'http://localhost:5000';
    }
  }
  return '';
};

export const BASE_URL = getApiBaseUrl();

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('railassist_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const api = {
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },
    register: async (data) => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getProfile: async () => {
      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateProfile: async (data) => {
      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    requestPasswordReset: async (email) => {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse(res);
    },
    resetPassword: async (token, newPassword) => {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, token }),
      });
      return handleResponse(res);
    },
    forgotPassword: async (email) => {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse(res);
    },
  },
  journeys: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/api/journeys`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getSummary: async (params) => {
      const queryParams = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/api/journeys/summary?${queryParams}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/journeys`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/api/journeys/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/api/journeys/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sync: async (journeys) => {
      const res = await fetch(`${BASE_URL}/api/journeys/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ journeys }),
      });
      return handleResponse(res);
    },
  },
  templates: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/api/templates`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/api/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  trains: {
    search: async (query) => {
      const res = await fetch(`${BASE_URL}/api/trains?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getDirectory: async (params) => {
      const res = await fetch(`${BASE_URL}/api/trains/directory?${params}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${BASE_URL}/api/trains/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/trains/directory`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/api/trains/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    toggleActive: async (id) => {
      const res = await fetch(`${BASE_URL}/api/trains/${id}/deactivate`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  stations: {
    getAll: async (params = '') => {
      const res = await fetch(`${BASE_URL}/api/stations?${params}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    search: async (query) => {
      const res = await fetch(`${BASE_URL}/api/stations/search?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getByCode: async (code) => {
      const res = await fetch(`${BASE_URL}/api/stations/${encodeURIComponent(code)}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/stations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (code, data) => {
      const res = await fetch(`${BASE_URL}/api/stations/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (code) => {
      const res = await fetch(`${BASE_URL}/api/stations/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sync: async () => {
      const res = await fetch(`${BASE_URL}/api/stations/sync`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  rules: {
    get: async () => {
      const res = await fetch(`${BASE_URL}/api/rules`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/api/rules/all`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  rosters: {
    getAll: async (month, year) => {
      const res = await fetch(`${BASE_URL}/api/rosters?month=${month}&year=${year}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/rosters`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/api/rosters/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/api/rosters/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sync: async (rosters) => {
      const res = await fetch(`${BASE_URL}/api/rosters/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rosters }),
      });
      return handleResponse(res);
    },
    convert: async (id) => {
      const res = await fetch(`${BASE_URL}/api/rosters/${id}/convert`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  statementTemplates: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/api/statement-templates`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sync: async (templates) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ templates }),
      });
      return handleResponse(res);
    },
    duplicate: async (id) => {
      const res = await fetch(`${BASE_URL}/api/statement-templates/${id}/duplicate`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  reports: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/api/reports`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  admin: {
    getMetrics: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getUsers: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateUser: async (id, data) => {
      const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteUser: async (id) => {
      const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getAuditLogs: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  ai: {
    uploadOcr: async (formData) => {
      const token = localStorage.getItem('railassist_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${BASE_URL}/api/ai/ocr/upload`, {
        method: 'POST',
        headers,
        body: formData
      });
      return handleResponse(res);
    },
    checkOcrStatus: async (jobId) => {
      const res = await fetch(`${BASE_URL}/api/ai/ocr/status/${jobId}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    parseVoice: async (data) => {
      const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    runAudit: async (month) => {
      const res = await fetch(`${BASE_URL}/api/ai/audit/validate?month=${encodeURIComponent(month)}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    chat: async (query) => {
      const res = await fetch(`${BASE_URL}/api/ai/chat/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query })
      });
      return handleResponse(res);
    }
  },
  meta: {
    getDivisions: async () => {
      const res = await fetch(`${BASE_URL}/api/divisions`);
      return handleResponse(res);
    },
  },
};
