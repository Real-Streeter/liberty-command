const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    throw new Error('Not authenticated');
  }

  if (res.status === 429) {
    throw new Error('Too many requests. Please wait a moment.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (name, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Board
  getColumns: () => request('/columns'),
  createTask: (task) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (moves) => request('/tasks/reorder', { method: 'PUT', body: JSON.stringify({ moves }) }),

  // RFPs
  getRfps: () => request('/rfps'),
  createRfp: (rfp) => request('/rfps', { method: 'POST', body: JSON.stringify(rfp) }),
  updateRfp: (id, data) => request(`/rfps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRfp: (id) => request(`/rfps/${id}`, { method: 'DELETE' }),

  // Team
  getTeam: () => request('/team'),
  createMember: (member) => request('/team', { method: 'POST', body: JSON.stringify(member) }),
  updateMember: (id, data) => request(`/team/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id) => request(`/team/${id}`, { method: 'DELETE' }),
};
