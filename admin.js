// ===== Admin Panel Logic =====

const STORAGE_KEYS = {
    submissions: 'bwpr_submissions',
    password: 'bwpr_admin_pass',
    session: 'bwpr_admin_session',
    emailSettings: 'bwpr_email_settings'
};

// Default password hash (admin123)
const DEFAULT_PASS_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

// ===== Utility Functions =====
async function hashPassword(pass) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getSubmissions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
    } catch { return []; }
}

function saveSubmissions(subs) {
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(subs));
}

function getPasswordHash() {
    return localStorage.getItem(STORAGE_KEYS.password) || DEFAULT_PASS_HASH;
}

function getEmailSettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.emailSettings) || '{}');
    } catch { return {}; }
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function serviceLabel(val) {
    const map = {
        repair: 'Well Pump Repair',
        installation: 'Pump Installation',
        'pressure-tank': 'Pressure Tank Service',
        inspection: 'Well Inspection',
        electrical: 'Electrical & Wiring',
        piping: 'Pipe & Line Repair',
        other: 'Other'
    };
    return map[val] || val || 'Not specified';
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Auth =====
const loginScreen = document.getElementById('loginScreen');
const adminApp = document.getElementById('adminApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Check existing session
if (sessionStorage.getItem(STORAGE_KEYS.session) === 'active') {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';
    initDashboard();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    const hash = await hashPassword(pass);

    if (hash === getPasswordHash()) {
        sessionStorage.setItem(STORAGE_KEYS.session, 'active');
        loginScreen.style.display = 'none';
        adminApp.style.display = 'flex';
        loginError.textContent = '';
        initDashboard();
    } else {
        loginError.textContent = 'Incorrect password. Please try again.';
        document.getElementById('adminPassword').value = '';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem(STORAGE_KEYS.session);
    location.reload();
});

// ===== Sidebar Navigation =====
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('pageTitle');

function switchTab(tabName) {
    sidebarLinks.forEach(l => l.classList.toggle('active', l.dataset.tab === tabName));
    tabContents.forEach(t => t.classList.toggle('active', t.id === `tab-${tabName}`));
    const titles = { dashboard: 'Dashboard', submissions: 'Submissions', settings: 'Settings' };
    pageTitle.textContent = titles[tabName] || 'Dashboard';
}

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
        // Close mobile sidebar
        document.querySelector('.sidebar').classList.remove('open');
    });
});

// View all link
document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(el.dataset.goto);
    });
});

// Mobile sidebar
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
mobileMenuBtn.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

// ===== Dashboard =====
function initDashboard() {
    updateStats();
    renderRecentTable();
    renderAllSubmissions();
    updateUnreadBadge();
    loadEmailSettings();
}

function updateStats() {
    const subs = getSubmissions();
    const today = new Date().toDateString();

    document.getElementById('totalSubmissions').textContent = subs.length;
    document.getElementById('newSubmissions').textContent = subs.filter(s => !s.read).length;
    document.getElementById('todaySubmissions').textContent = subs.filter(s => new Date(s.date).toDateString() === today).length;

    // Top service
    if (subs.length > 0) {
        const counts = {};
        subs.forEach(s => { counts[s.service] = (counts[s.service] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('topService').textContent = serviceLabel(top[0]).split(' ')[0];
    }
}

function updateUnreadBadge() {
    const unread = getSubmissions().filter(s => !s.read).length;
    const badge = document.getElementById('unreadBadge');
    if (unread > 0) {
        badge.style.display = 'inline';
        badge.textContent = unread;
    } else {
        badge.style.display = 'none';
    }
}

function buildTableHTML(subs, limit) {
    if (subs.length === 0) {
        return '<p class="empty-state"><i class="fas fa-inbox"></i><br>No submissions yet.</p>';
    }

    const items = limit ? subs.slice(0, limit) : subs;
    let html = `<table>
        <thead><tr>
            <th>Status</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Service</th>
            <th>Date</th>
            <th>Actions</th>
        </tr></thead><tbody>`;

    items.forEach(sub => {
        html += `<tr class="${sub.read ? '' : 'unread'}" data-id="${sub.id}">
            <td>${sub.read ? '<span class="status-read">Read</span>' : '<span class="status-new"><i class="fas fa-circle" style="font-size:6px"></i> New</span>'}</td>
            <td><strong>${escapeHtml(sub.name)}</strong></td>
            <td>${escapeHtml(sub.phone)}</td>
            <td>${serviceLabel(sub.service)}</td>
            <td>${formatDate(sub.date)}</td>
            <td>
                <div class="table-actions">
                    <button class="table-btn view-btn" data-id="${sub.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="table-btn delete-btn" data-id="${sub.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderRecentTable() {
    const subs = getSubmissions().sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('recentTable').innerHTML = buildTableHTML(subs, 5);
    attachTableEvents('recentTable');
}

function renderAllSubmissions() {
    const subs = getSubmissions().sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('allSubmissionsTable').innerHTML = buildTableHTML(subs);
    attachTableEvents('allSubmissionsTable');
}

function attachTableEvents(containerId) {
    const container = document.getElementById(containerId);

    container.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openDetail(btn.dataset.id));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this submission?')) {
                deleteSubmission(btn.dataset.id);
            }
        });
    });
}

// ===== Detail Modal =====
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalCallBtn = document.getElementById('modalCallBtn');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');

let currentDetailId = null;

function openDetail(id) {
    const subs = getSubmissions();
    const sub = subs.find(s => s.id === id);
    if (!sub) return;

    currentDetailId = id;

    // Mark as read
    if (!sub.read) {
        sub.read = true;
        saveSubmissions(subs);
        updateStats();
        updateUnreadBadge();
        renderRecentTable();
        renderAllSubmissions();
    }

    modalBody.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Full Name</div>
            <div class="detail-value">${escapeHtml(sub.name)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Phone Number</div>
            <div class="detail-value"><a href="tel:${escapeHtml(sub.phone)}" style="color:var(--primary);font-weight:700">${escapeHtml(sub.phone)}</a></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Email</div>
            <div class="detail-value">${sub.email ? escapeHtml(sub.email) : '<span style="color:var(--text-muted)">Not provided</span>'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Service Needed</div>
            <div class="detail-value">${serviceLabel(sub.service)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Message</div>
            <div class="detail-value">${sub.message ? escapeHtml(sub.message) : '<span style="color:var(--text-muted)">No message</span>'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Submitted</div>
            <div class="detail-value">${formatDate(sub.date)}</div>
        </div>
    `;

    modalCallBtn.href = `tel:${sub.phone}`;
    detailModal.style.display = 'flex';
}

modalClose.addEventListener('click', () => { detailModal.style.display = 'none'; });
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.style.display = 'none'; });

modalDeleteBtn.addEventListener('click', () => {
    if (currentDetailId && confirm('Delete this submission?')) {
        deleteSubmission(currentDetailId);
        detailModal.style.display = 'none';
    }
});

function deleteSubmission(id) {
    let subs = getSubmissions();
    subs = subs.filter(s => s.id !== id);
    saveSubmissions(subs);
    updateStats();
    updateUnreadBadge();
    renderRecentTable();
    renderAllSubmissions();
    showToast('Submission deleted');
}

// Mark All Read
document.getElementById('markAllRead').addEventListener('click', () => {
    const subs = getSubmissions();
    subs.forEach(s => s.read = true);
    saveSubmissions(subs);
    updateStats();
    updateUnreadBadge();
    renderRecentTable();
    renderAllSubmissions();
    showToast('All marked as read');
});

// Delete All
document.getElementById('deleteAll').addEventListener('click', () => {
    if (confirm('Delete ALL submissions? This cannot be undone.')) {
        saveSubmissions([]);
        updateStats();
        updateUnreadBadge();
        renderRecentTable();
        renderAllSubmissions();
        showToast('All submissions deleted');
    }
});

// ===== Settings: Change Password =====
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('passMsg');
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;

    const currentHash = await hashPassword(current);
    if (currentHash !== getPasswordHash()) {
        msg.textContent = 'Current password is incorrect.';
        msg.className = 'settings-msg error';
        return;
    }

    if (newPass !== confirm) {
        msg.textContent = 'New passwords do not match.';
        msg.className = 'settings-msg error';
        return;
    }

    if (newPass.length < 4) {
        msg.textContent = 'Password must be at least 4 characters.';
        msg.className = 'settings-msg error';
        return;
    }

    const newHash = await hashPassword(newPass);
    localStorage.setItem(STORAGE_KEYS.password, newHash);
    msg.textContent = 'Password updated successfully!';
    msg.className = 'settings-msg success';
    e.target.reset();
});

// ===== Settings: Email Notifications =====
function loadEmailSettings() {
    const settings = getEmailSettings();
    document.getElementById('emailServiceId').value = settings.serviceId || '';
    document.getElementById('emailTemplateId').value = settings.templateId || '';
    document.getElementById('emailPublicKey').value = settings.publicKey || '';
    document.getElementById('notifEmail').value = settings.email || '';
}

document.getElementById('emailSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('emailMsg');
    const settings = {
        serviceId: document.getElementById('emailServiceId').value.trim(),
        templateId: document.getElementById('emailTemplateId').value.trim(),
        publicKey: document.getElementById('emailPublicKey').value.trim(),
        email: document.getElementById('notifEmail').value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.emailSettings, JSON.stringify(settings));
    msg.textContent = 'Email settings saved!';
    msg.className = 'settings-msg success';
});

document.getElementById('testEmailBtn').addEventListener('click', async () => {
    const msg = document.getElementById('emailMsg');
    const settings = getEmailSettings();

    if (!settings.serviceId || !settings.templateId || !settings.publicKey || !settings.email) {
        msg.textContent = 'Please fill in all email settings first.';
        msg.className = 'settings-msg error';
        return;
    }

    try {
        // Load EmailJS if not loaded
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            document.head.appendChild(script);
            await new Promise(r => script.onload = r);
        }

        emailjs.init(settings.publicKey);
        await emailjs.send(settings.serviceId, settings.templateId, {
            to_email: settings.email,
            from_name: 'Test Notification',
            customer_name: 'Test Customer',
            customer_phone: '(352) 000-0000',
            customer_email: 'test@example.com',
            service_type: 'Well Pump Repair',
            message: 'This is a test notification from your admin panel.',
            date: new Date().toLocaleString()
        });

        msg.textContent = 'Test email sent! Check your inbox.';
        msg.className = 'settings-msg success';
    } catch (err) {
        msg.textContent = 'Failed to send: ' + (err.text || err.message || 'Check your settings');
        msg.className = 'settings-msg error';
    }
});

// ===== Settings: Browser Notifications =====
document.getElementById('enableNotifBtn').addEventListener('click', async () => {
    const msg = document.getElementById('notifMsg');
    if (!('Notification' in window)) {
        msg.textContent = 'Browser notifications are not supported.';
        msg.className = 'settings-msg error';
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        msg.textContent = 'Browser notifications enabled!';
        msg.className = 'settings-msg success';
        new Notification('Bucks Well Pump Repair', {
            body: 'Notifications are now enabled. You will be alerted for new submissions.',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>'
        });
    } else {
        msg.textContent = 'Permission denied. Please enable in browser settings.';
        msg.className = 'settings-msg error';
    }
});

// ===== Settings: Export CSV =====
document.getElementById('exportCsv').addEventListener('click', () => {
    const subs = getSubmissions();
    if (subs.length === 0) {
        showToast('No submissions to export', 'error');
        return;
    }

    const headers = ['Date', 'Name', 'Phone', 'Email', 'Service', 'Message', 'Status'];
    const rows = subs.map(s => [
        new Date(s.date).toLocaleString(),
        s.name,
        s.phone,
        s.email || '',
        serviceLabel(s.service),
        (s.message || '').replace(/"/g, '""'),
        s.read ? 'Read' : 'New'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
});

// ===== Listen for new submissions (cross-tab) =====
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.submissions) {
        updateStats();
        updateUnreadBadge();
        renderRecentTable();
        renderAllSubmissions();
    }
});

// Poll for new submissions every 5 seconds (same tab)
let lastCount = getSubmissions().length;
setInterval(() => {
    const current = getSubmissions().length;
    if (current > lastCount) {
        updateStats();
        updateUnreadBadge();
        renderRecentTable();
        renderAllSubmissions();

        // Browser notification
        if (Notification.permission === 'granted') {
            const newest = getSubmissions().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            new Notification('New Submission!', {
                body: `${newest.name} - ${serviceLabel(newest.service)}`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>'
            });
        }
    }
    lastCount = current;
}, 5000);
