/* ═══════════════════════════════════════════
   PlastiPay — Dashboard Application
   SPA with dynamic page rendering + CRUD
   ═══════════════════════════════════════════ */

const App = {
    currentPage: 'dashboard',

    init() {
        if (Auth.isLoggedIn() && Auth.isAdmin()) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
        this.bindEvents();
        this.updateDate();
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.page);
            });
        });
        document.getElementById('btn-logout').addEventListener('click', () => {
            Auth.logout();
            this.showLogin();
        });
    },

    updateDate() {
        const el = document.getElementById('current-date');
        if (el) {
            el.textContent = new Date().toLocaleDateString('fr-TN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    },

    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard-screen').classList.add('hidden');
    },

    showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        if (Auth.user) {
            document.getElementById('admin-name').textContent = `${Auth.user.firstName} ${Auth.user.lastName}`;
            document.getElementById('admin-avatar').textContent = Auth.user.firstName?.charAt(0) || 'A';
        }
        this.navigateTo('dashboard');
    },

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>';
        errorEl.textContent = '';
        try {
            await Auth.login(email, password);
            this.showDashboard();
        } catch (error) {
            errorEl.textContent = error.message;
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Se connecter</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        }
    },

    navigateTo(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        const titles = {
            dashboard: ['Dashboard', "Vue d'ensemble du système PlastiPay"],
            users: ['Utilisateurs', 'Gestion des comptes utilisateurs'],
            machines: ['Machines', 'Gestion des machines de collecte'],
            transactions: ['Transactions', 'Historique des dépôts de bouteilles'],
            rewards: ['Récompenses', 'Gestion du catalogue de récompenses'],
        };
        document.getElementById('page-title').textContent = titles[page]?.[0] || page;
        document.getElementById('page-subtitle').textContent = titles[page]?.[1] || '';
        this.loadPage(page);
    },

    showLoading() {
        document.getElementById('content-area').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    },

    async loadPage(page) {
        this.showLoading();
        try {
            switch (page) {
                case 'dashboard': await this.renderDashboard(); break;
                case 'users': await this.renderUsers(); break;
                case 'machines': await this.renderMachines(); break;
                case 'transactions': await this.renderTransactions(); break;
                case 'rewards': await this.renderRewards(); break;
            }
        } catch (error) {
            document.getElementById('content-area').innerHTML = `<div class="empty-state"><p>❌ Erreur : ${error.message}</p></div>`;
        }
    },

    // ═══════════════════════════════════════════
    // TOAST & MODAL HELPERS
    // ═══════════════════════════════════════════
    toast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },

    showModal(html) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">${html}</div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        return overlay;
    },

    closeModal() {
        const m = document.querySelector('.modal-overlay');
        if (m) m.remove();
    },

    modalInput(label, name, value = '', type = 'text', placeholder = '') {
        return `<div class="input-group">
            <label for="modal-${name}">${label}</label>
            <input type="${type}" id="modal-${name}" name="${name}" value="${value}" placeholder="${placeholder}">
        </div>`;
    },

    modalSelect(label, name, options, selected = '') {
        const opts = options.map(o => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return `<option value="${val}" ${val === selected ? 'selected' : ''}>${lbl}</option>`;
        }).join('');
        return `<div class="input-group"><label for="modal-${name}">${label}</label><select id="modal-${name}" name="${name}">${opts}</select></div>`;
    },

    // ═══════════════════════════════════════════
    // DASHBOARD PAGE
    // ═══════════════════════════════════════════
    async renderDashboard() {
        const res = await Auth.apiGet('/api/admin/stats');
        if (!res?.success) throw new Error('Impossible de charger les stats');
        const { overview, recentTransactions, topUsers } = res.data;
        document.getElementById('content-area').innerHTML = `
            <div class="fade-in">
                <div class="stats-grid">
                    ${this.statCard('👥', 'Utilisateurs', overview.totalUsers, 'inscrits', 'green')}
                    ${this.statCard('🏭', 'Machines', overview.activeMachines + '/' + overview.totalMachines, 'actives', 'blue')}
                    ${this.statCard('🍾', 'Bouteilles', overview.totalBottles, 'recyclées', 'cyan')}
                    ${this.statCard('💰', 'Points Distribués', overview.totalPointsDistributed, 'pts total', 'orange')}
                    ${this.statCard('📋', 'Transactions', overview.totalTransactions, 'dépôts', 'purple')}
                    ${this.statCard('♻️', 'Impact Écolo', (overview.totalBottles * 0.025).toFixed(1) + ' kg', 'plastique évité', 'green')}
                </div>
                <div class="dashboard-grid">
                    <div>
                        <div class="section-header"><h3 class="section-title">📋 Transactions récentes</h3></div>
                        <div class="data-table-wrapper"><table class="data-table">
                            <thead><tr><th>Utilisateur</th><th>Machine</th><th>Bouteilles</th><th>Points</th><th>Date</th></tr></thead>
                            <tbody>${recentTransactions.map(t => `<tr>
                                <td><div class="user-info"><div class="user-avatar-sm">${t.user.firstName.charAt(0)}</div><div><div class="user-name-text">${t.user.firstName} ${t.user.lastName}</div><div class="user-email-text">${t.user.email}</div></div></div></td>
                                <td>${t.machine.name}</td>
                                <td><span class="type-badge ${t.bottleType}">${t.bottlesCount} ${t.bottleType}</span></td>
                                <td><span class="points-text">+${t.pointsEarned}</span></td>
                                <td>${this.formatDate(t.createdAt)}</td>
                            </tr>`).join('')}</tbody>
                        </table></div>
                    </div>
                    <div>
                        <div class="section-header"><h3 class="section-title">🏆 Top Recycleurs</h3></div>
                        <div class="data-table-wrapper"><table class="data-table">
                            <thead><tr><th>#</th><th>Nom</th><th>Points</th><th>Dépôts</th></tr></thead>
                            <tbody>${topUsers.map((u, i) => `<tr>
                                <td><span class="rank-badge ${['gold','silver','bronze'][i] || ''}">${i+1}</span></td>
                                <td><div class="user-info"><div class="user-avatar-sm">${u.firstName.charAt(0)}</div><span class="user-name-text">${u.firstName} ${u.lastName}</span></div></td>
                                <td><span class="points-text">${u.totalPoints}</span></td>
                                <td>${u.totalDeposits}</td>
                            </tr>`).join('')}</tbody>
                        </table></div>
                    </div>
                </div>
            </div>`;
    },

    // ═══════════════════════════════════════════
    // USERS PAGE (with CRUD)
    // ═══════════════════════════════════════════
    async renderUsers() {
        const res = await Auth.apiGet('/api/admin/users');
        if (!res?.success) throw new Error('Impossible de charger les utilisateurs');
        const { users } = res.data;

        document.getElementById('content-area').innerHTML = `
            <div class="fade-in">
                <div class="stats-grid">
                    ${this.statCard('👥', 'Total', users.length, 'comptes', 'green')}
                    ${this.statCard('👤', 'Utilisateurs', users.filter(u => u.role === 'user').length, 'actifs', 'blue')}
                    ${this.statCard('🛡️', 'Admins', users.filter(u => u.role === 'admin').length, 'comptes', 'orange')}
                    ${this.statCard('💰', 'Points Total', users.reduce((s,u) => s + u.totalPoints, 0), 'pts distribués', 'purple')}
                </div>
                <div class="section-header">
                    <h3 class="section-title">👥 Liste des utilisateurs</h3>
                    <button class="btn-add" onclick="App.showUserModal()">+ Ajouter un utilisateur</button>
                </div>
                <div class="data-table-wrapper"><table class="data-table">
                    <thead><tr><th>Utilisateur</th><th>Téléphone</th><th>Rôle</th><th>Points</th><th>Dépôts</th><th>Actions</th></tr></thead>
                    <tbody>${users.map(u => `<tr>
                        <td><div class="user-info"><div class="user-avatar-sm ${u.role === 'admin' ? 'admin-type' : ''}">${u.firstName.charAt(0)}</div><div><div class="user-name-text">${u.firstName} ${u.lastName}</div><div class="user-email-text">${u.email}</div></div></div></td>
                        <td>${u.phone || '—'}</td>
                        <td><span class="status-badge ${u.role === 'admin' ? 'active' : 'pending'}"><span class="status-dot"></span>${u.role}</span></td>
                        <td><span class="points-text">${u.totalPoints}</span></td>
                        <td>${u.totalDeposits}</td>
                        <td><div class="action-btns">
                            <button class="btn-icon edit" onclick='App.showUserModal(${JSON.stringify({id:u.id,email:u.email,phone:u.phone||"",firstName:u.firstName,lastName:u.lastName,role:u.role,totalPoints:u.totalPoints})})' title="Modifier">✏️</button>
                            <button class="btn-icon delete" onclick="App.deleteUser(${u.id}, \`${u.firstName} ${u.lastName}\`)" title="Supprimer">🗑️</button>
                        </div></td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>`;
    },

    showUserModal(user = null) {
        const isEdit = !!user;
        const html = `
            <h2>${isEdit ? '✏️ Modifier' : '➕ Ajouter'} un utilisateur</h2>
            <form id="user-form">
                ${this.modalInput('Prénom', 'firstName', user?.firstName || '', 'text', 'Prénom')}
                ${this.modalInput('Nom', 'lastName', user?.lastName || '', 'text', 'Nom')}
                ${this.modalInput('Email', 'email', user?.email || '', 'email', 'email@example.com')}
                ${this.modalInput('Téléphone', 'phone', user?.phone || '', 'tel', '+216...')}
                ${this.modalInput('Mot de passe' + (isEdit ? ' (laisser vide pour ne pas changer)' : ''), 'password', '', 'password', '••••••••')}
                ${this.modalSelect('Rôle', 'role', [{value:'user',label:'Utilisateur'},{value:'admin',label:'Administrateur'}], user?.role || 'user')}
                ${isEdit ? this.modalInput('Points', 'totalPoints', user?.totalPoints || 0, 'number') : ''}
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="App.closeModal()">Annuler</button>
                    <button type="submit" class="btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
                </div>
            </form>`;
        this.showModal(html);
        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                firstName: document.getElementById('modal-firstName').value,
                lastName: document.getElementById('modal-lastName').value,
                email: document.getElementById('modal-email').value,
                phone: document.getElementById('modal-phone').value,
                password: document.getElementById('modal-password').value,
                role: document.getElementById('modal-role').value,
            };
            if (isEdit) {
                body.totalPoints = document.getElementById('modal-totalPoints')?.value;
                if (!body.password) delete body.password;
            }
            try {
                const res = isEdit
                    ? await Auth.apiPut(`/api/admin/users/${user.id}`, body)
                    : await Auth.apiPost('/api/admin/users', body);
                if (res?.success) {
                    this.toast(res.message);
                    this.closeModal();
                    this.renderUsers();
                } else {
                    this.toast(res?.message || 'Erreur', 'error');
                }
            } catch (err) { this.toast('Erreur réseau', 'error'); }
        });
    },

    async deleteUser(id, name) {
        if (!confirm(`Supprimer l'utilisateur "${name}" ?\nCette action est irréversible.`)) return;
        try {
            const res = await Auth.apiDelete(`/api/admin/users/${id}`);
            if (res?.success) { this.toast(res.message); this.renderUsers(); }
            else this.toast(res?.message || 'Erreur', 'error');
        } catch (err) { this.toast('Erreur réseau', 'error'); }
    },

    // ═══════════════════════════════════════════
    // MACHINES PAGE (with CRUD)
    // ═══════════════════════════════════════════
    async renderMachines() {
        const res = await Auth.apiGet('/api/machines');
        if (!res?.success) throw new Error('Impossible de charger les machines');
        const { machines } = res.data;

        document.getElementById('content-area').innerHTML = `
            <div class="fade-in">
                <div class="stats-grid">
                    ${this.statCard('🏭', 'Total', machines.length, 'machines', 'blue')}
                    ${this.statCard('✅', 'Actives', machines.filter(m => m.status === 'active').length, 'en ligne', 'green')}
                    ${this.statCard('🔧', 'Maintenance', machines.filter(m => m.status === 'maintenance').length, 'en cours', 'orange')}
                    ${this.statCard('❌', 'Hors ligne', machines.filter(m => m.status === 'offline').length, 'déconnectées', 'red')}
                </div>
                <div class="section-header">
                    <h3 class="section-title">🏭 Liste des machines</h3>
                    <button class="btn-add" onclick="App.showMachineModal()">+ Ajouter une machine</button>
                </div>
                <div class="data-table-wrapper"><table class="data-table">
                    <thead><tr><th>Nom</th><th>Emplacement</th><th>N° Série</th><th>Statut</th><th>Dépôts</th><th>Dernier ping</th><th>Actions</th></tr></thead>
                    <tbody>${machines.map(m => `<tr>
                        <td><strong>${m.name}</strong></td>
                        <td>${m.location}</td>
                        <td><span class="machine-serial">${m.serialNumber}</span></td>
                        <td><span class="status-badge ${m.status}"><span class="status-dot"></span>${m.status}</span></td>
                        <td>${m.totalDeposits}</td>
                        <td>${m.lastPing ? this.formatDate(m.lastPing) : '—'}</td>
                        <td><div class="action-btns">
                            <button class="btn-icon edit" onclick='App.showMachineModal(${JSON.stringify({id:m.id,name:m.name,location:m.location,serialNumber:m.serialNumber,status:m.status})})' title="Modifier">✏️</button>
                            <button class="btn-icon" onclick="App.showQRModal(${m.id}, \`${m.serialNumber}\`, \`${m.name}\`, \`${m.location}\`)" title="QR Code" style="background:rgba(34,197,94,0.1)">📱</button>
                            <button class="btn-icon delete" onclick="App.deleteMachine(${m.id}, \`${m.name}\`)" title="Supprimer">🗑️</button>
                        </div></td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>`;
    },

    showMachineModal(machine = null) {
        const isEdit = !!machine;
        const html = `
            <h2>${isEdit ? '✏️ Modifier' : '➕ Ajouter'} une machine</h2>
            <form id="machine-form">
                ${this.modalInput('Nom', 'name', machine?.name || '', 'text', 'Machine Cafétéria')}
                ${this.modalInput('Emplacement', 'location', machine?.location || '', 'text', 'Cafétéria principale - RDC')}
                ${this.modalInput('Numéro de série', 'serialNumber', machine?.serialNumber || '', 'text', 'ECO-TN-003')}
                ${isEdit ? this.modalSelect('Statut', 'status', [
                    {value:'active', label:'✅ Active'},
                    {value:'maintenance', label:'🔧 Maintenance'},
                    {value:'offline', label:'❌ Hors ligne'}
                ], machine?.status || 'active') : ''}
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="App.closeModal()">Annuler</button>
                    <button type="submit" class="btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
                </div>
            </form>`;
        this.showModal(html);
        document.getElementById('machine-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                name: document.getElementById('modal-name').value,
                location: document.getElementById('modal-location').value,
                serialNumber: document.getElementById('modal-serialNumber').value,
            };
            if (isEdit) body.status = document.getElementById('modal-status')?.value;
            try {
                const res = isEdit
                    ? await Auth.apiPut(`/api/admin/machines/${machine.id}`, body)
                    : await Auth.apiPost('/api/machines', body);
                if (res?.success) {
                    this.toast(res.message);
                    this.closeModal();
                    this.renderMachines();
                } else {
                    this.toast(res?.message || 'Erreur', 'error');
                }
            } catch (err) { this.toast('Erreur réseau', 'error'); }
        });
    },

    async deleteMachine(id, name) {
        if (!confirm(`Supprimer la machine "${name}" ?\nToutes ses transactions seront supprimées.`)) return;
        try {
            const res = await Auth.apiDelete(`/api/admin/machines/${id}`);
            if (res?.success) { this.toast(res.message); this.renderMachines(); }
            else this.toast(res?.message || 'Erreur', 'error');
        } catch (err) { this.toast('Erreur réseau', 'error'); }
    },

    showQRModal(machineId, serialNumber, name, location) {
        const baseUrl = window.location.origin;
        const qrUrl = `${baseUrl}/app?machine=${serialNumber}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=000000&margin=10`;

        const html = `
            <div style="text-align:center">
                <h2 style="margin-bottom:4px">📱 QR Code Machine</h2>
                <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">${name} — ${location}</p>
                <div style="background:white;display:inline-block;padding:16px;border-radius:16px;margin-bottom:16px">
                    <img src="${qrImageUrl}" width="240" height="240" alt="QR Code ${serialNumber}" style="display:block">
                </div>
                <div style="margin-bottom:16px">
                    <span style="font-family:monospace;font-size:13px;background:var(--bg-primary);padding:8px 16px;border-radius:8px;color:var(--green-primary);display:inline-block;word-break:break-all;max-width:100%">${qrUrl}</span>
                </div>
                <p style="color:var(--text-muted);font-size:12px;margin-bottom:20px">Scannez ce QR code pour accéder directement à la machine</p>
                <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
                    <button type="button" class="btn-secondary" onclick="App.closeModal()">Fermer</button>
                    <button type="button" class="btn-primary" onclick="navigator.clipboard.writeText('${qrUrl}').then(()=>App.toast('Lien copié! 📋'))">📋 Copier le lien</button>
                    <button type="button" class="btn-primary" onclick="window.open('/api/machines/${machineId}/qr/print?token=' + Auth.token, '_blank')" style="background:var(--accent-orange)">🖨️ Imprimer sticker</button>
                </div>
            </div>`;
        this.showModal(html);
    },

    // ═══════════════════════════════════════════
    // TRANSACTIONS PAGE
    // ═══════════════════════════════════════════
    async renderTransactions() {
        const res = await Auth.apiGet('/api/transactions/all');
        if (!res?.success) throw new Error('Impossible de charger les transactions');
        const { transactions, pagination } = res.data;
        document.getElementById('content-area').innerHTML = `
            <div class="fade-in">
                <div class="stats-grid">${this.statCard('📋', 'Total', pagination.total, 'transactions', 'blue')}</div>
                <div class="data-table-wrapper"><table class="data-table">
                    <thead><tr><th>#</th><th>Utilisateur</th><th>Machine</th><th>Type</th><th>Bouteilles</th><th>Points</th><th>Date</th></tr></thead>
                    <tbody>${transactions.map(t => `<tr>
                        <td><span style="color:var(--text-muted);font-size:12px">${t.id}</span></td>
                        <td><div class="user-info"><div class="user-avatar-sm">${t.user.firstName.charAt(0)}</div><div><div class="user-name-text">${t.user.firstName} ${t.user.lastName}</div><div class="user-email-text">${t.user.email}</div></div></div></td>
                        <td>${t.machine.name}</td>
                        <td><span class="type-badge ${t.bottleType}">${t.bottleType}</span></td>
                        <td>${t.bottlesCount}</td>
                        <td><span class="points-text">+${t.pointsEarned}</span></td>
                        <td>${this.formatDate(t.createdAt)}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>`;
    },

    // ═══════════════════════════════════════════
    // REWARDS PAGE
    // ═══════════════════════════════════════════
    async renderRewards() {
        const res = await Auth.apiGet('/api/rewards');
        if (!res?.success) throw new Error('Impossible de charger les récompenses');
        const { rewards } = res.data;
        document.getElementById('content-area').innerHTML = `
            <div class="fade-in">
                <div class="stats-grid">
                    ${this.statCard('🎁', 'Total', rewards.length, 'récompenses', 'purple')}
                    ${this.statCard('☕', 'Café', rewards.filter(r => r.category === 'coffee').length, 'offres', 'orange')}
                    ${this.statCard('🥤', 'Boissons', rewards.filter(r => r.category === 'drink').length, 'offres', 'cyan')}
                    ${this.statCard('🎁', 'Cadeaux', rewards.filter(r => r.category === 'gift').length, 'offres', 'green')}
                </div>
                <div class="data-table-wrapper"><table class="data-table">
                    <thead><tr><th>Récompense</th><th>Description</th><th>Catégorie</th><th>Coût</th><th>Statut</th></tr></thead>
                    <tbody>${rewards.map(r => `<tr>
                        <td><strong>${r.name}</strong></td>
                        <td style="color:var(--text-secondary);font-size:13px">${r.description}</td>
                        <td><span class="type-badge ${r.category}">${r.category}</span></td>
                        <td><span class="points-text">${r.pointsCost} pts</span></td>
                        <td><span class="status-badge ${r.isActive ? 'active' : 'offline'}"><span class="status-dot"></span>${r.isActive ? 'Actif' : 'Inactif'}</span></td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>`;
    },

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════
    statCard(icon, label, value, sub, color) {
        return `<div class="stat-card" style="--card-accent: var(--${color === 'green' ? 'green-primary' : color === 'blue' ? 'blue-primary' : color === 'orange' ? 'accent-orange' : color === 'purple' ? 'accent-purple' : color === 'cyan' ? 'accent-cyan' : 'accent-red'})">
            <div class="stat-card-header"><div class="stat-card-icon ${color}">${icon}</div><span class="stat-card-label">${label}</span></div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-card-sub">${sub}</div>
        </div>`;
    },

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
