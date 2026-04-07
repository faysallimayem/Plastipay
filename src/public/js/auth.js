/* ═══════════════════════════════════════════
   PlastiPay — Auth Module
   Handles login, token storage, and session
   ═══════════════════════════════════════════ */

const API_BASE = '';

const Auth = {
    token: null,
    user: null,

    init() {
        this.token = localStorage.getItem('plastipay_token');
        const userData = localStorage.getItem('plastipay_user');
        if (userData) {
            try { this.user = JSON.parse(userData); } catch { this.user = null; }
        }
    },

    isLoggedIn() {
        return !!this.token && !!this.user;
    },

    isAdmin() {
        return this.user?.role === 'admin';
    },

    async login(email, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (data.data.user.role !== 'admin') throw new Error('Accès réservé aux administrateurs.');
        
        this.token = data.data.token;
        this.user = data.data.user;
        localStorage.setItem('plastipay_token', this.token);
        localStorage.setItem('plastipay_user', JSON.stringify(this.user));
        return data.data;
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('plastipay_token');
        localStorage.removeItem('plastipay_user');
    },

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
        };
    },

    async apiGet(url) {
        const res = await fetch(`${API_BASE}${url}`, { headers: this.getHeaders() });
        if (res.status === 401) { this.logout(); location.reload(); return; }
        return res.json();
    },

    async apiPost(url, body) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        if (res.status === 401) { this.logout(); location.reload(); return; }
        return res.json();
    },

    async apiPatch(url, body) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        if (res.status === 401) { this.logout(); location.reload(); return; }
        return res.json();
    },

    async apiPut(url, body) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        if (res.status === 401) { this.logout(); location.reload(); return; }
        return res.json();
    },

    async apiDelete(url) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (res.status === 401) { this.logout(); location.reload(); return; }
        return res.json();
    },
};

Auth.init();
