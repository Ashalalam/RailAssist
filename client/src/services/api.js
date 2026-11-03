const BASE_URL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) ? 'http://localhost:5000' : '';

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
    forgotPassword: async (email, newPassword) => {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
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
  trains: {
    search: async (query) => {
      const res = await fetch(`${BASE_URL}/api/trains?q=${encodeURIComponent(query)}`, {
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
    parseVoice: async (transcript) => {
      const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ transcript })
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
