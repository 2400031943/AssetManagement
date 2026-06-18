import { getStoredToken, getStoredUser } from './authSession';

/**
 * api.js  —  Centralized API service
 *
 * To switch from mock data to the real MS SQL backend:
 *   1. Set  USE_MOCK = false
 *   2. Make sure the Flask backend is running on http://localhost:5000
 *   3. Done — all calls will hit the real endpoints automatically.
 */


const USE_MOCK = true;                     // ← flip to true for mock data
const BASE_URL = 'http://localhost:5000/api'; // ← Flask backend URL

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getToken() {
  return getStoredToken();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.msg || 'API error');
  return data;
}

// ---------------------------------------------------------------------------
// Mock data  (used when USE_MOCK = true)
// ---------------------------------------------------------------------------

const MOCK_USERS = [
  // ── Users ────────────────────────────────────────────────────────────────
  { id: 1, username: 'manoj',      emp_code: 'NR1001', role: 'User',      area: 'Balanagar', division: 'DPFD',  assetCount: 2, employeeName: 'Manoj',      designation: 'Engineer' },
  { id: 2, username: 'irfansait',  emp_code: 'NR1002', role: 'User',      area: 'Shadnagar', division: 'ASAG',  assetCount: 1, employeeName: 'Irfan Sait', designation: 'Senior Engineer' },
  { id: 2, username: 'Rahim',  emp_code: 'NR01412', role: 'Technisian',      area: 'Shadnagar', division: 'ASAG',  assetCount: 1, employeeName: 'Rahim', designation: 'Technisian' },
  { id: 4, username: 'suresh',     emp_code: 'NR1004', role: 'User',      area: 'Shadnagar', division: 'RSAA',  assetCount: 1, employeeName: 'Suresh',     designation: 'Engineer' },
  // ── Admin ─────────────────────────────────────────────────────────────────
  { id: 3, username: 'admin',      emp_code: 'NR0001', role: 'Admin',     area: null,        division: 'ASCID', assetCount: 0, employeeName: 'Admin',      designation: 'Administrator' },
  // ── Area Admins ───────────────────────────────────────────────────────────
  { id: 5, username: 'areaadmin1', emp_code: 'NR2001', role: 'AreaAdmin', area: 'Balanagar', division: 'DPFD',  assetCount: 0, employeeName: 'Area Admin 1', designation: 'Area Administrator' },
  { id: 6, username: 'areaadmin2', emp_code: 'NR2002', role: 'AreaAdmin', area: 'Shadnagar', division: 'RSAA',  assetCount: 0, employeeName: 'Area Admin 2', designation: 'Area Administrator' },
];

const MOCK_ASSETS = [
  {
    id: 1, name: 'Dell Monitor 24"',  CATEGORY: 'PC TYPE 1',     serialNumber: 'SN-12345',
    make: 'Dell',  model: 'UltraSharp', ipAddress: '192.168.1.10', networkDomain: 'ASDMLAN',
    AREA: 'Balanagar', LOCATION: 'Balanagar', acmsFms: 'ACMS', fmsExpiryDate: null,
    assigned_to: 1, assignedUserName: 'manoj', status: 'Assigned',
    UserDivision: 'DPFD', GROUP: 'SPFPG', AssetCustodianECNO: 'NR1001',
  },
  {
    id: 2, name: 'HP ProBook 450',    CATEGORY: 'PC TYPE 2',     serialNumber: 'HP-5544',
    make: 'HP',    model: 'ProBook G8', ipAddress: '192.168.1.45', networkDomain: 'SpaceNet',
    AREA: 'Balanagar', LOCATION: 'Balanagar', acmsFms: 'FMS', fmsExpiryDate: '2026-12-31',
    assigned_to: 1, assignedUserName: 'manoj', status: 'Assigned',
    UserDivision: 'DPFD', GROUP: 'SPFPG', AssetCustodianECNO: 'NR1001',
  },
  {
    id: 3, name: 'Dell PowerEdge R730', CATEGORY: 'SERVER TYPE 1', serialNumber: 'SRV-9001',
    make: 'Dell',  model: 'PowerEdge R730', ipAddress: '10.0.0.1',  networkDomain: 'ASDMLAN',
    AREA: 'Balanagar', LOCATION: 'RSAA Datacentre Balanagar', acmsFms: 'ACMS', fmsExpiryDate: null,
    assigned_to: 3, assignedUserName: 'admin', status: 'Assigned',
    UserDivision: 'ASCID', GROUP: 'RSAA', AssetCustodianECNO: 'NR0001',
  },
  {
    id: 4, name: 'MacBook Pro 16"',   CATEGORY: 'PC TYPE 3',     serialNumber: 'MAC-9876',
    make: 'Apple', model: 'M2 Pro',    ipAddress: '192.168.2.10', networkDomain: 'Internet',
    AREA: 'Shadnagar', LOCATION: 'Shadnagar', acmsFms: 'FMS', fmsExpiryDate: '2027-03-15',
    assigned_to: 2, assignedUserName: 'irfansait', status: 'Assigned',
    UserDivision: 'ASAG', GROUP: 'ASAG', AssetCustodianECNO: 'NR1002',
  },
  {
    id: 5, name: 'Cisco Catalyst 2960', CATEGORY: 'SP TYPE 1',   serialNumber: 'SW-441',
    make: 'Cisco', model: 'Catalyst 2960', ipAddress: '10.0.1.1', networkDomain: 'ASDMLAN',
    AREA: 'Shadnagar', LOCATION: 'Shadnagar', acmsFms: 'ACMS', fmsExpiryDate: null,
    assigned_to: 4, assignedUserName: 'suresh', status: 'Assigned',
    UserDivision: 'RSAA', GROUP: 'RSAA', AssetCustodianECNO: 'NR1004',
  },
  {
    id: 6, name: 'NetApp Storage Array', CATEGORY: 'STORAGE TYPE 2', serialNumber: 'STR-221',
    make: 'NetApp', model: 'AFF A400', ipAddress: '10.0.0.5',   networkDomain: 'ASDMLAN',
    AREA: 'Balanagar', LOCATION: 'RSAA Datacentre Balanagar', acmsFms: 'ACMS', fmsExpiryDate: null,
    assigned_to: 3, assignedUserName: 'admin', status: 'Assigned',
    UserDivision: 'ASCID', GROUP: 'RSAA', AssetCustodianECNO: 'NR0001',
  },
];

function delay(ms = 600) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function login(emp_code, password) {
  if (USE_MOCK) {
    await delay();
    // Mock: accept any password, just check emp_code exists
    const user = MOCK_USERS.find(u => u.emp_code.toUpperCase() === emp_code.toUpperCase());
    if (!user) throw new Error('No account found with that Employee Code. Check your credentials.');
    return { user, token: 'mock-jwt-token' };
  }
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emp_code, password }),
  });
}

export async function getCurrentUserProfile() {
  if (USE_MOCK) {
    await delay();
    return getStoredUser();
  }
  return apiFetch('/auth/me');
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

export async function getAllUsers() {
  if (USE_MOCK) {
    await delay();
    return MOCK_USERS;
  }
  return apiFetch('/users');
}

export async function getUsersByArea(area) {
  if (USE_MOCK) {
    await delay();
    return MOCK_USERS.filter(u => u.area === area);
  }
  return apiFetch(`/users/area/${encodeURIComponent(area)}`);
}

// ---------------------------------------------------------------------------
// ASSETS
// ---------------------------------------------------------------------------

export async function getMyAssets() {
  if (USE_MOCK) {
    await delay();
    const me = getStoredUser();
    const employeeCode = (me.emp_code || '').trim().toUpperCase();
    // My Assets — returns from local Asset_Manager DB (mocked as MOCK_ASSETS)
    return MOCK_ASSETS.filter(a => (
      a.AssetCustodianECNO || ''
    ).trim().toUpperCase() === employeeCode);
  }
  return apiFetch('/assets/mine');
}

/**
 * Fetch the logged-in user's records from dbo.ACMS_list_2027.
 * Returns [] gracefully when the table doesn't exist on this machine.
 */
export async function getMyAcms2027Assets() {
  if (USE_MOCK) {
    // No mock data for this table — it lives only on the production DB
    await delay(400);
    return [];
  }
  return apiFetch('/assets/acms2027/mine');
}

/**
 * Check whether a serial number exists in dbo.ACMS_list_2026 and/or dbo.ACMS_list_2027.
 * Returns { in_2026: bool|null, in_2027: bool|null }
 * null means the table could not be reached.
 * NOTE: Always hits the real backend regardless of USE_MOCK — these are local DB tables.
 */
export async function checkSerialInLists(serialNumber) {
  if (!serialNumber) return { in_2026: null, in_2027: null };
  // Always call the real backend — ACMS_list_2027 is the local DB, always accessible
  return apiFetch(`/assets/check-in-lists?serial_number=${encodeURIComponent(serialNumber)}`);
}

/**
 * Predict the ACMS system category from a brief configuration description.
 * Uses the trained TF-IDF + LinearSVC ML model on the backend.
 * Returns { predicted, display, confidence, top3 }
 * Always hits the real backend (ML model is local).
 */
export async function predictCategory(configurationText) {
  if (!configurationText || !configurationText.trim()) return null;
  return apiFetch('/predict-category', {
    method: 'POST',
    body: JSON.stringify({ configuration: configurationText.trim() }),
  });
}

/**
 * Fetch asset recommendations from the remote cowmis database (ACMS$ / FMS$ tables).
 * These are shown on the Add Asset page so the user can quickly pre-fill the form.
 */
export async function getAssetRecommendations() {
  if (USE_MOCK) {
    await delay();
    const me = getStoredUser();
    const employeeCode = (me.emp_code || '').trim().toUpperCase();
    // Simulate remote cowmis data — same mock pool but tagged as remote recommendations
    return MOCK_ASSETS
      .filter(a => (a.AssetCustodianECNO || '').trim().toUpperCase() === employeeCode)
      .map((a, i) => ({
        ...a,
        id: `cowmis-${i + 1}`,
        sourceTable: a.acmsFms || 'ACMS',
      }));
  }
  return apiFetch('/assets/recommendations');
}

/**
 * Search TBST_ASSETS in cowmis by EQSRLNO (partial match).
 * Used by the search bar in the recommendations panel.
 */
export async function searchAssetRecommendations(q) {
  if (!q || !q.trim()) return [];
  if (USE_MOCK) {
    await delay(300);
    return MOCK_ASSETS
      .filter(a => (a.serialNumber || '').toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10)
      .map((a, i) => ({ ...a, id: `search-${i + 1}`, sourceTable: 'TBST_ASSETS' }));
  }
  return apiFetch(`/assets/recommendations/search?q=${encodeURIComponent(q.trim())}`);
}

/**
 * Search TBST_ASSETS in cowmis by serial number for the "Where is my Asset" panel.
 * Returns ASSETNO (assetNumber), EQSRLNO (serialNumber), EQPTDESCP (description), ACUSTODIAN (custodian).
 */
export async function searchWhereIsMyAsset(q) {
  if (!q || !q.trim()) return [];
  if (USE_MOCK) {
    await delay(300);
    return MOCK_ASSETS
      .filter(a => (a.serialNumber || '').toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10)
      .map((a, i) => ({
        id: `wima-${i + 1}`,
        assetNumber:  a.asset_number  || a.assetNumber  || '',
        serialNumber: a.serialNumber  || '',
        description:  a.configuration || a.model        || '',
        custodian:    a.AssetCustodianECNO || '',
      }));
  }
  return apiFetch(`/assets/where-is-my-asset?q=${encodeURIComponent(q.trim())}`);
}


export async function getAllAssets() {
  if (USE_MOCK) {
    await delay();
    return MOCK_ASSETS;
  }
  return apiFetch('/assets');
}

export async function getAssetsByUser(userId) {
  if (USE_MOCK) {
    await delay();
    return MOCK_ASSETS.filter(a => a.assigned_to === userId);
  }
  return apiFetch(`/assets?user_id=${userId}`);
}

export async function getAssetsByArea(area) {
  if (USE_MOCK) {
    await delay();
    return MOCK_ASSETS.filter(a => a.AREA === area);
  }
  return apiFetch(`/assets?area=${encodeURIComponent(area)}`);
}

export async function createAsset(assetData) {
  if (USE_MOCK) {
    await delay();
    const newAsset = { ...assetData, id: Date.now(), status: 'Available' };
    MOCK_ASSETS.push(newAsset);
    return newAsset;
  }
  return apiFetch('/assets', {
    method: 'POST',
    body: JSON.stringify(assetData),
  });
}

export async function updateAsset(assetId, assetData) {
  if (USE_MOCK) {
    await delay();
    const idx = MOCK_ASSETS.findIndex(a => a.id === assetId);
    if (idx !== -1) MOCK_ASSETS[idx] = { ...MOCK_ASSETS[idx], ...assetData };
    return MOCK_ASSETS[idx];
  }
  return apiFetch(`/assets/${assetId}`, {
    method: 'PUT',
    body: JSON.stringify(assetData),
  });
}

export async function deleteAsset(assetId) {
  if (USE_MOCK) {
    await delay();
    const idx = MOCK_ASSETS.findIndex(a => a.id === assetId);
    if (idx !== -1) MOCK_ASSETS.splice(idx, 1);
    return { message: 'Asset deleted' };
  }
  return apiFetch(`/assets/${assetId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// APPROVAL PENDING WORKFLOW
// ---------------------------------------------------------------------------

/** Fetch the list of available approvers. Always fetches from real remote DB. */
export async function getApprovers() {
  return apiFetch('/assets/approvers');
}

/** Fetch the list of available Area Focal Points. Always fetches from real remote DB. */
export async function getRegistrars() {
  return apiFetch('/assets/registrars');
}

/** Fetch the list of available Deputy Directors. Always fetches from real remote DB. */
export async function getDDs() {
  return apiFetch('/assets/dds');
}

/** Fetch the list of available Admins. Always fetches from real remote DB. */
export async function getAdmins() {
  return apiFetch('/assets/admins');
}

/** Save a single asset as a Draft pending request (no approver selected yet). */
export async function requestAssetAdd(data) {
  if (USE_MOCK) {
    await delay(500);
    return { message: 'Saved as draft (mock)', id: Math.floor(Math.random() * 1000) };
  }
  return apiFetch('/assets/request-add', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Get all Draft pending requests for the logged-in user. */
export async function getDraftRequests() {
  if (USE_MOCK) { await delay(400); return []; }
  return apiFetch('/assets/pending-requests/drafts');
}

/**
 * Submit selected drafts for approval with chosen Approver, Area Focal Point and DD.
 * draftIds: number[], approverEcno/Name, registrarEcno/Name, ddEcno/Name, ...designations
 */
export async function submitPendingRequests(payload) {
  if (USE_MOCK) {
    await delay(600);
    return { message: 'Submitted (mock)', submitted: payload.draftIds?.length || 0, errors: [] };
  }
  return apiFetch('/assets/pending-requests/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Get all pending requests submitted by the logged-in user. */
export async function getPendingRequests(includeWithdrawn = false) {
  if (USE_MOCK) { await delay(400); return []; }
  const qs = includeWithdrawn ? '?include_withdrawn=true' : '';
  return apiFetch(`/assets/pending-requests${qs}`);
}

/** Withdraw a specific pending request by its ID. */
export async function withdrawPendingRequest(requestId) {
  if (USE_MOCK) { await delay(300); return { message: 'Withdrawn (mock)' }; }
  return apiFetch(`/assets/pending-requests/${requestId}/withdraw`, { method: 'POST' });
}

/** Get requests currently awaiting MY approval action. */
export async function getAssignedApprovals() {
  if (USE_MOCK) { await delay(400); return []; }
  return apiFetch('/assets/assigned-to-me');
}

/**
 * Approve or reject a pending request.
 * action: 'approve' | 'reject'
 * remarks: optional string
 */
export async function approveOrRejectRequest(requestId, action, remarks = '') {
  if (USE_MOCK) {
    await delay(500);
    return { message: `${action}d (mock)`, status: action === 'approve' ? 'Approved' : 'Rejected' };
  }
  return apiFetch(`/assets/pending-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ action, remarks }),
  });
}

/**
 * Submit a deletion request for an asset in dbo.ACMS_list_2027.
 * data: { acmsListId, approverEcno, approverName, registrarEcno, registrarName, ddEcno, ddName }
 */
export async function requestAssetDelete(data) {
  return apiFetch('/assets/request-delete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Edit asset details on a pending request (approver / AFP / DD / Admin only).
 * data: partial asset fields — only included keys are updated.
 */
export async function editPendingRequest(requestId, data) {
  return apiFetch(`/assets/pending-requests/${requestId}/edit`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
