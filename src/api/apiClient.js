// Replacement for @base44/sdk — calls our own backend instead

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Entity helpers ────────────────────────────────────────────────────────────
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

// ─── Main client ───────────────────────────────────────────────────────────────
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
};
