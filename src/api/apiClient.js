const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function makeEntity(name) {
  return {
    list: (sort, limit) =>
      apiFetch(`/entities/${name}/list?sort=${sort || 'id'}&limit=${limit || 1000}`),
    filter: (filter, sort, limit) =>
      apiFetch(`/entities/${name}/filter`, {
        method: 'POST',
        body: JSON.stringify({ filter, sort, limit }),
      }),
    create: (data) =>
      apiFetch(`/entities/${name}/create`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiFetch(`/entities/${name}/${id}`, { method: 'DELETE' }),
  };
}

export const apiClient = {
  entities: {
    MandatoryProduct: makeEntity('MandatoryProduct'),
    UNSPSCCode: makeEntity('UNSPSCCode'),
    HSCode: makeEntity('HSCode'),
    SearchLog: makeEntity('SearchLog'),
  },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        const data = await apiFetch('/integrations/llm', {
          method: 'POST',
          body: JSON.stringify({ prompt }),
        });
        return data.result;
      },
    },
  },
  auth: {
    login: (email, password) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password) =>
      apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => apiFetch('/auth/me'),
  },
  dictionary: {
    list: () => apiFetch('/dictionary'),
    add: (word_ar, word_en) =>
      apiFetch('/dictionary', { method: 'POST', body: JSON.stringify({ word_ar, word_en }) }),
  },
  feedback: {
    send: (query, result_type, result_id, confirmed) =>
      apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ query, result_type, result_id, confirmed }),
      }),
    getRejected: (query) =>
      apiFetch(`/feedback/rejected?query=${encodeURIComponent(query)}`),
  },
};
