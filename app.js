const API_BASE = '';
let currentApiKey = null;
let currentOrgId = null;
let currentOffset = 0;
const PAGE_SIZE = 20;
let conversations = [];

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const loginForm = document.getElementById('login-form');
const apiKeyInput = document.getElementById('api-key-input');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const loginLoader = document.getElementById('login-loader');
const logoutBtn = document.getElementById('logout-btn');

const orgNameEl = document.getElementById('org-name');
const userEmailEl = document.getElementById('user-email');
const convListEl = document.getElementById('conversations-list');
const refreshBtn = document.getElementById('refresh-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const paginationControls = document.getElementById('pagination-controls');

const detailEmptyState = document.getElementById('detail-empty-state');
const transcriptView = document.getElementById('transcript-view');
const detailStatus = document.getElementById('detail-status');
const detailDuration = document.getElementById('detail-duration');
const transcriptContent = document.getElementById('transcript-content');

// Init
function init() {
    const savedKey = localStorage.getItem('nxvet_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
        authenticate(savedKey);
    }
}

// Switch Views
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active', 'hidden'));
    
    Object.keys(views).forEach(k => {
        if (k !== viewName) {
            setTimeout(() => views[k].classList.add('hidden'), 300);
        }
    });
    
    views[viewName].classList.remove('hidden');
    setTimeout(() => views[viewName].classList.add('active'), 50);
}

// API Methods
async function apiCall(endpoint, method = 'GET') {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${currentApiKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${response.status}`);
    }
    
    if (response.status === 204) return null;
    return response.json();
}

async function authenticate(key) {
    currentApiKey = key;
    setLoading(true);
    loginError.classList.add('hidden');
    
    try {
        const data = await apiCall('/api/auth/me');
        currentOrgId = data.organizationId;
        
        localStorage.setItem('nxvet_api_key', key);
        
        orgNameEl.textContent = data.organizationName;
        userEmailEl.textContent = data.email;
        
        showView('dashboard');
        await loadConversations(true);
    } catch (err) {
        loginError.textContent = err.message === 'HTTP error 401' ? 'Invalid API Key' : err.message;
        loginError.classList.remove('hidden');
        localStorage.removeItem('nxvet_api_key');
    } finally {
        setLoading(false);
    }
}

async function loadConversations(reset = false) {
    if (reset) {
        currentOffset = 0;
        conversations = [];
        convListEl.innerHTML = '<div class="empty-state">Loading...</div>';
    }
    
    const types = ['ClinicConversation', 'NxMIC', 'AudioButtonRecording', 'DictationAudio', 'PhoneCallAudio'];
    const typeParams = types.map(t => `types=${t}`).join('&');
    const url = `/api/organizations/${currentOrgId}/labels?${typeParams}&limit=${PAGE_SIZE}&offset=${currentOffset}&sortingProperty=FromTime&isSortingDescending=true`;
    
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            headers: { 'Authorization': `Bearer ${currentApiKey}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch labels');
        const data = await response.json();
        const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
        
        if (reset) conversations = [];
        conversations = [...conversations, ...data];
        currentOffset += data.length;
        
        renderConversations();
        
        if (currentOffset < totalCount) {
            paginationControls.classList.remove('hidden');
        } else {
            paginationControls.classList.add('hidden');
        }
    } catch (err) {
        console.error(err);
        if (reset) {
            convListEl.innerHTML = `<div class="empty-state" style="color:var(--status-error)">Error loading data</div>`;
        }
    }
}

// Rendering
function formatTime(ms) {
    if (!ms) return 'Unknown Time';
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0m 00s';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

function renderConversations() {
    if (conversations.length === 0) {
        convListEl.innerHTML = '<div class="empty-state">No records found</div>';
        return;
    }
    
    convListEl.innerHTML = '';
    conversations.forEach((conv) => {
        const el = document.createElement('div');
        el.className = 'conversation-item';
        
        let status = 'RECORDED';
        try {
            if (conv.metadata) {
                const meta = JSON.parse(conv.metadata);
                if (meta.status) status = meta.status.toUpperCase();
            }
        } catch (e) {}

        const deviceName = conv.friendlyName || conv.deviceSerial || 'Unknown Device';

        el.innerHTML = `
            <div class="conv-header">
                <span class="conv-time">${formatTime(conv.fromTime)}</span>
                <span class="badge ${status === 'COMPLETED' ? 'completed' : 'processing'}">${status}</span>
            </div>
            <div class="conv-meta">
                <span>Type: ${conv.type}</span>
                <span>${deviceName}</span>
            </div>
        `;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('selected'));
            el.classList.add('selected');
            showTranscript(conv);
        });
        
        convListEl.appendChild(el);
    });
}

async function showTranscript(conv) {
    detailEmptyState.classList.remove('active');
    transcriptView.classList.remove('hidden');
    
    transcriptContent.innerHTML = '<div class="empty-state">Loading notes...</div>';
    
    let status = 'RECORDED';
    try {
        if (conv.metadata) {
            const meta = JSON.parse(conv.metadata);
            if (meta.status) status = meta.status.toUpperCase();
        }
    } catch (e) {}
    
    detailStatus.className = `badge ${status === 'COMPLETED' ? 'completed' : 'processing'}`;
    detailStatus.textContent = status;
    
    const durationMs = (conv.toTime && conv.fromTime) ? (conv.toTime - conv.fromTime) : 0;
    detailDuration.textContent = `Duration: ${formatDuration(durationMs)}`;

    try {
        const fullLabel = await apiCall(`/api/labels/${conv.id}`);
        
        if (!fullLabel.ownedPatientNotes || fullLabel.ownedPatientNotes.length === 0) {
            transcriptContent.innerHTML = `<em style="color:var(--text-muted)">No notes or transcript available for this record yet.</em>`;
            return;
        }

        let html = '';
        
        fullLabel.ownedPatientNotes.forEach(note => {
            if (note.type === 'SOAP') {
                try {
                    const soapData = JSON.parse(note.content);
                    html += `
                        <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                            <h4 style="margin-bottom: 12px; color: var(--accent-secondary);">Clinical Note</h4>
                    `;
                    if (soapData.clinical_note) {
                        Object.entries(soapData.clinical_note).forEach(([key, val]) => {
                            if (val && val.value) {
                                html += `<p style="margin-bottom: 8px;"><strong style="color: #e2e8f0;">${key}:</strong> <span style="color: var(--text-secondary);">${val.value.replace(/\n/g, '<br>')}</span></p>`;
                            }
                        });
                    }
                    html += `</div>`;
                } catch (e) {
                    html += `<h4>SOAP Note</h4><div style="margin-bottom: 24px;">${note.content}</div>`;
                }
            }
        });

        fullLabel.ownedPatientNotes.forEach(note => {
            if (note.type === 'Transcript') {
                html += `
                    <h4 style="margin-bottom: 12px; color: var(--text-primary);">Full Transcript</h4>
                    <div style="white-space: pre-wrap; color: var(--text-secondary);">${note.content}</div>
                `;
            }
        });
        
        transcriptContent.innerHTML = html || `<em style="color:var(--text-muted)">Notes format not recognized.</em>`;

    } catch (err) {
        transcriptContent.innerHTML = `<em style="color:var(--status-error)">Failed to load details.</em>`;
    }
}

// Utils
function setLoading(isLoading) {
    loginBtn.querySelector('span').style.opacity = isLoading ? '0' : '1';
    if (isLoading) {
        loginLoader.classList.remove('hidden');
        loginBtn.disabled = true;
    } else {
        loginLoader.classList.add('hidden');
        loginBtn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('nxvet_api_key');
    currentApiKey = null;
    currentOrgId = null;
    apiKeyInput.value = '';
    showView('login');
    
    transcriptView.classList.add('hidden');
    detailEmptyState.classList.add('active');
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = apiKeyInput.value.trim();
    if (key) authenticate(key);
});

logoutBtn.addEventListener('click', logout);
refreshBtn.addEventListener('click', () => loadConversations(true));
loadMoreBtn.addEventListener('click', () => loadConversations(false));

// Start
init();
