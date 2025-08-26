import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: This ensures cookies are sent with requests
});

// Store access token in memory
let accessToken = null;

// Set access token
export const setAccessToken = (token) => {
  accessToken = token;
};

// Get access token
export const getAccessToken = () => accessToken;

// Clear access token
export const clearAccessToken = () => {
  accessToken = null;
};

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken: newAccessToken } = response.data;
        setAccessToken(newAccessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearAccessToken();
        try {
          const path = window.location?.pathname || '';
          if (path.startsWith('/admin')) {
            window.location.href = '/admin-login';
          } else if (path.startsWith('/faculty')) {
            window.location.href = '/faculty';
          } else {
            window.location.href = '/';
          }
        } catch (_) {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { accessToken: token } = response.data;
    setAccessToken(token);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },

  registerStudent: async (data) => {
    return await api.post('/auth/register-student', data);
  },
};

// Admin API functions
export const adminAPI = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getDepartments: async (params = {}) => {
    const response = await api.get('/admin/departments', { params });
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await api.post('/admin/departments', data);
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await api.put(`/admin/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id) => {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data;
  },

  getFaculty: async (params = {}) => {
    const response = await api.get('/admin/faculty', { params });
    return response.data;
  },

  createFaculty: async (data) => {
    const response = await api.post('/admin/faculty', data);
    return response.data;
  },

  updateFaculty: async (id, data) => {
    const response = await api.put(`/admin/faculty/${id}`, data);
    return response.data;
  },

  deleteFaculty: async (id) => {
    const response = await api.delete(`/admin/faculty/${id}`);
    return response.data;
  },

  getStudents: async (params = {}) => {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  createStudent: async (data) => {
    const response = await api.post('/admin/students', data);
    return response.data;
  },

  approveStudent: async (studentId, approve) => {
    const response = await api.patch(`/admin/students/${studentId}/approve`, { approve });
    return response.data;
  },

  updateStudent: async (id, data) => {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },

  getClasses: async (params = {}) => {
    const response = await api.get('/admin/classes', { params });
    return response.data;
  },

  createClass: async (data) => {
    const response = await api.post('/admin/classes', data);
    return response.data;
  },

  updateClass: async (id, data) => {
    const response = await api.put(`/admin/classes/${id}`, data);
    return response.data;
  },

  deleteClass: async (id) => {
    const response = await api.delete(`/admin/classes/${id}`);
    return response.data;
  },

  endClass: async (id) => {
    const response = await api.patch(`/admin/classes/${id}/end`);
    return response.data;
  },

  assignFacultyToClass: async (payload) => {
    const response = await api.post('/admin/assign-faculty-to-class', payload);
    return response.data;
  },

  // Subjects
  getSubjects: async (params = {}) => {
    const response = await api.get('/admin/subjects', { params });
    return response.data;
  },

  createSubject: async (data) => {
    const response = await api.post('/admin/subjects', data);
    return response.data;
  },

  updateSubject: async (id, data) => {
    const response = await api.put(`/admin/subjects/${id}`, data);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
  },

  bulkImportStudents: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/bulk/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  bulkImportFaculty: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/bulk/faculty', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  exportStudents: async () => {
    const response = await api.get('/admin/export/students', {
      responseType: 'blob',
    });
    return response.data;
  },

  exportFaculty: async () => {
    const response = await api.get('/admin/export/faculty', {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadStudentsTemplate: async () => {
    const response = await api.get('/admin/template/students', {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadFacultyTemplate: async () => {
    const response = await api.get('/admin/template/faculty', {
      responseType: 'blob',
    });
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  enrollStudent: async (studentId, classId) => {
    const response = await api.post(`/admin/students/${studentId}/enroll`, { classId });
    return response.data;
  },

  getClassReport: async (classId) => {
    const response = await api.get(`/admin/reports/class/${classId}`);
    return response.data;
  },

  // SSE for real-time notifications
  subscribeToEvents: (options = {}) => {
    // Lightweight EventSource wrapper with reconnect + token refresh
    class ReconnectingEventSource {
      constructor(baseUrl, opts = {}) {
        this.baseUrl = baseUrl;
        this.withCredentials = opts.withCredentials ?? true;
        this.minDelay = opts.minDelay ?? 1000; // 1s
        this.maxDelay = opts.maxDelay ?? 30000; // 30s
        this.retryCount = 0;
        this._listeners = new Map();
        this._timer = null;
        this._closed = false;
        this._es = null;
        this._onopen = null;
        this._onmessage = null;
        this._onerror = null;
        this._open();
      }

      _buildUrl() {
        const token = getAccessToken?.();
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
        return `${this.baseUrl}${tokenParam}`;
      }

      _attachHandlers() {
        if (!this._es) return;
        // property handlers
        this._es.onopen = (evt) => {
          this.retryCount = 0; // reset backoff on successful open
          if (typeof this._onopen === 'function') this._onopen(evt);
        };
        this._es.onmessage = (evt) => {
          if (typeof this._onmessage === 'function') this._onmessage(evt);
        };
        this._es.onerror = (evt) => {
          // Close underlying ES and schedule a controlled reconnect
          try { this._es.close(); } catch (_) {}
          if (typeof this._onerror === 'function') this._onerror(evt);
          this._scheduleReconnect();
        };
        // reattach addEventListener listeners
        for (const [type, set] of this._listeners) {
          for (const listener of set) {
            try { this._es.addEventListener(type, listener); } catch (_) {}
          }
        }
      }

      _refreshTokenIfPossible() {
        try {
          // best-effort; ignore failures
          return axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((resp) => {
              const nxt = resp?.data?.accessToken;
              if (nxt) setAccessToken(nxt);
            })
            .catch(() => {});
        } catch (_) {
          return Promise.resolve();
        }
      }

      _open() {
        if (this._closed) return;
        try {
          // Create a fresh EventSource
          this._es = new EventSource(this._buildUrl(), { withCredentials: this.withCredentials });
          this._attachHandlers();
        } catch (e) {
          this._scheduleReconnect();
        }
      }

      _scheduleReconnect() {
        if (this._closed) return;
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        const expo = Math.min(this.maxDelay, this.minDelay * Math.pow(2, this.retryCount));
        const jitter = Math.floor(Math.random() * 250);
        const delay = Math.max(this.minDelay, expo) + jitter;
        this.retryCount += 1;
        this._timer = setTimeout(() => {
          this._refreshTokenIfPossible()?.finally(() => this._open());
        }, delay);
      }

      addEventListener(type, listener) {
        if (!this._listeners.has(type)) this._listeners.set(type, new Set());
        this._listeners.get(type).add(listener);
        if (this._es) {
          try { this._es.addEventListener(type, listener); } catch (_) {}
        }
      }

      removeEventListener(type, listener) {
        const set = this._listeners.get(type);
        if (set) set.delete(listener);
        if (this._es) {
          try { this._es.removeEventListener(type, listener); } catch (_) {}
        }
      }

      close() {
        this._closed = true;
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        if (this._es) {
          try { this._es.close(); } catch (_) {}
        }
      }

      // Expose "onopen/onmessage/onerror" properties like native EventSource
      set onopen(fn) { this._onopen = fn; if (this._es) this._es.onopen = fn; }
      get onopen() { return this._onopen; }
      set onmessage(fn) { this._onmessage = fn; if (this._es) this._es.onmessage = fn; }
      get onmessage() { return this._onmessage; }
      set onerror(fn) { this._onerror = fn; if (this._es) this._es.onerror = (evt) => { try { this._es.close(); } catch(_) {} if (typeof fn === 'function') fn(evt); this._scheduleReconnect(); }; }
      get onerror() { return this._onerror; }
    }

    return new ReconnectingEventSource(`${API_BASE_URL}/admin/events`, {
      withCredentials: true,
      minDelay: options.minDelay,
      maxDelay: options.maxDelay,
    });
  },
};

export default api;
