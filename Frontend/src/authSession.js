const STORAGE_KEY = 'user';

function parseStoredUser(rawValue) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getStoredSession() {
  const stored = parseStoredUser(localStorage.getItem(STORAGE_KEY));
  const nestedUser = stored.user && typeof stored.user === 'object' ? stored.user : {};
  const token = stored.token || stored.access_token || nestedUser.token || nestedUser.access_token || null;
  const user = { ...nestedUser, ...stored };
  delete user.user;
  return { user, token };
}

export function getStoredUser() {
  return getStoredSession().user;
}

export function getStoredToken() {
  return getStoredSession().token;
}

export function setStoredSession(user, token) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...user,
    token: token || null,
  }));
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}
