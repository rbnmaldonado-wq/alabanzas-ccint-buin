import { initAuth, authState, onAuthChange, login, logout } from './authService.js';
import { state, actions, subscribe } from './store.js';
import { api } from './apiService.js';
import { initSongsUI, renderSongsList } from './songsView.js';
import { initSundayUI } from './sundayView.js';
import { initRehearsalsUI } from './rehearsalsView.js';

// Elementos UI
const authOverlay = document.getElementById('authOverlay');
const authStatusText = document.getElementById('authStatusText');
const manualLoginBtn = document.getElementById('manualLoginBtn');
const manualAuthTrigger = document.getElementById('manualAuthTrigger');
const appContainer = document.getElementById('appContainer');
const userInfoDisplay = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const pageTitle = document.getElementById('pageTitle');

// Configuración elements
const sheetIdInput = document.getElementById('sheetIdInput');
const saveSheetIdBtn = document.getElementById('saveSheetIdBtn');
const configUserEmail = document.getElementById('configUserEmail');
const configAdminSection = document.getElementById('configAdminSection');
const configUsersSection = document.getElementById('configUsersSection');
const configUserRole = document.getElementById('configUserRole');
const usersListContainer = document.getElementById('usersListContainer');

// Action buttons
const addSongBtn = document.getElementById('addSongBtn');
const saveSundayBtn = document.getElementById('saveSundayBtn');
const navProponer = document.getElementById('navProponer');

// Propose form (inline in view)
const proposeForm = document.getElementById('proposeForm');
const proposeNameInput = document.getElementById('proposeNameInput');
const proposeNotesInput = document.getElementById('proposeNotesInput');
const proposeYoutubeInput = document.getElementById('proposeYoutubeInput');
const proposalsList = document.getElementById('proposalsList');

// Dashboard elements
const dashboardLogo = document.getElementById('dashboardLogo');
const dashboardChurchName = document.getElementById('dashboardChurchName');
const dashboardTeam = document.getElementById('dashboardTeam');
const dashboardSunday = document.getElementById('dashboardSunday');
const statSongs = document.getElementById('statSongs');
const statPending = document.getElementById('statPending');
const statMembers = document.getElementById('statMembers');

// Church config elements
const configChurchSection = document.getElementById('configChurchSection');
const churchNameInput = document.getElementById('churchNameInput');
const churchLogoFile = document.getElementById('churchLogoFile');
const logoPreview = document.getElementById('logoPreview');
const saveChurchInfoBtn = document.getElementById('saveChurchInfoBtn');
let pendingLogoBase64 = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar configuración local
    actions.loadFromStorage();

    // 2. Listeners UI Globales
    if (manualLoginBtn) manualLoginBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // 3. Navegación entre tabs
    initNavigation();

    // 4. Configuración — Guardar Sheet ID
    if (saveSheetIdBtn) {
        saveSheetIdBtn.addEventListener('click', async () => {
            const newId = sheetIdInput.value.trim();
            if (!newId) {
                alert('Ingresa un ID de Google Sheet válido.');
                return;
            }
            actions.setChurchId(newId);
            alert('ID guardado correctamente. Cargando datos...');
            try {
                await api.loadAll();
                resolveUserRole();
            } catch (e) {
                console.error('Error cargando datos con nuevo ID:', e);
                alert('Error cargando datos. Verifica que el ID sea correcto.');
            }
        });
    }

    // 5. Church info save
    if (churchLogoFile) {
        churchLogoFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            compressImage(file, 300, 0.7, (base64) => {
                pendingLogoBase64 = base64;
                if (logoPreview) {
                    logoPreview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            });
        });
    }
    if (saveChurchInfoBtn) {
        saveChurchInfoBtn.addEventListener('click', async () => {
            const name = churchNameInput ? churchNameInput.value.trim() : '';
            if (name) state.church.config.churchName = name;
            if (pendingLogoBase64) {
                localStorage.setItem('worship_church_logo', pendingLogoBase64);
                pendingLogoBase64 = null;
            }
            localStorage.setItem('worship_church_name', name);
            renderDashboard();
            alert('Información de iglesia guardada.');
        });
    }

    // 6. Propose form (inline)
    if (proposeForm) {
        proposeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = proposeNameInput.value.trim();
            if (!name) return;
            try {
                await api.addProposal({
                    id: Date.now(),
                    name: name,
                    suggestedBy: authState.userEmail || 'Anónimo',
                    priority: 'Normal',
                    notes: proposeNotesInput.value.trim(),
                    youtubeLink: proposeYoutubeInput ? proposeYoutubeInput.value.trim() : '',
                    dateAdded: new Date().toISOString()
                });
                proposeForm.reset();
                alert('¡Propuesta enviada!');
                renderProposalsList();
            } catch (err) {
                console.error('Error enviando propuesta:', err);
                alert('Error al enviar propuesta.');
            }
        });
    }

    // 6. Inicializar Módulos UI
    initSongsUI();
    initSundayUI();
    initRehearsalsUI();

    // 7. Suscribirse a cambios
    onAuthChange(handleAuthChange);
    subscribe('loading-start', (e) => console.log('Cargando:', e.detail.message));
    subscribe('data-loaded', () => {
        console.log('Datos cargados. Renderizando UI...');
        renderSongsList();
        resolveUserRole();
        renderProposalsList();
        renderDashboard();
    });

    // 8. Iniciar Auth
    try {
        await initAuth();
    } catch (e) {
        console.error('Error fatal iniciando app:', e);
        if (authStatusText) authStatusText.textContent = 'Error iniciando sistema. Revisa consola.';
    }
});

// --- Navegación entre Tabs ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            const labelEl = item.querySelector('.nav-label');
            const title = labelEl ? labelEl.textContent : tab;

            // Update active class
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Switch views
            document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
            const targetView = document.getElementById(`view-${tab}`);
            if (targetView) targetView.style.display = 'block';

            // Update title
            if (pageTitle) pageTitle.textContent = title;

            // Track current view in state
            state.ui.currentView = tab;
        });
    });
}

// --- Resolve User Role from Server Data ---
async function resolveUserRole() {
    if (!authState.userEmail || !state.users || state.users.length === 0) {
        actions.setUserRole('invitado');
        applyRolePermissions('invitado');
        return;
    }

    const currentUser = state.users.find(u =>
        u.email && u.email.toLowerCase() === authState.userEmail.toLowerCase()
    );

    if (currentUser) {
        const role = currentUser.role || 'invitado';
        actions.setUserRole(role);
        applyRolePermissions(role);
    } else {
        const newUser = {
            email: authState.userEmail,
            name: authState.userName || authState.userEmail.split('@')[0],
            role: 'invitado',
            joinedDate: new Date().toISOString()
        };
        try {
            await api.addUser(newUser);
        } catch (e) {
            console.warn('Error registrando usuario nuevo:', e);
        }
        actions.setUserRole('invitado');
        applyRolePermissions('invitado');
    }
}

// --- Role Permissions ---
const ROLE_LABELS = {
    lider: '👑 Líder',
    musico: '🎸 Músico',
    invitado: '🌱 Invitado'
};

function applyRolePermissions(role) {
    const isLider = role === 'lider';
    const isMusico = role === 'musico';

    // Config sections — Líder only
    if (configAdminSection) configAdminSection.style.display = isLider ? 'block' : 'none';
    if (configChurchSection) configChurchSection.style.display = isLider ? 'block' : 'none';
    if (configUsersSection) {
        configUsersSection.style.display = isLider ? 'block' : 'none';
        if (isLider) renderUsersList();
    }

    // Role display
    if (configUserRole) configUserRole.textContent = ROLE_LABELS[role] || role;

    // Repertorio buttons
    if (addSongBtn) addSongBtn.style.display = isLider ? 'inline-flex' : 'none';

    // Nav Proponer — visible for Líder and Músico
    if (navProponer) navProponer.style.display = (isLider || isMusico) ? 'flex' : 'none';

    // Sunday save button
    if (saveSundayBtn) saveSundayBtn.style.display = isLider ? 'inline-block' : 'none';

    // Edit buttons in song cards — handled by CSS class on body
    document.body.setAttribute('data-role', role);
}

// --- Render Proposals List ---
function renderProposalsList() {
    if (!proposalsList) return;
    const proposals = state.pending || [];

    if (proposals.length === 0) {
        proposalsList.innerHTML = '<p>No hay propuestas aún.</p>';
        return;
    }

    proposalsList.innerHTML = proposals.map(p => `
        <div class="glass-card" style="padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="color: white; font-weight: 500;">🎵 ${p.name}</p>
                    ${p.notes ? `<p style="font-size: 0.8em; color: #64748b; margin-top: 3px;">${p.notes}</p>` : ''}
                    ${p.youtubeLink ? `<a href="${p.youtubeLink}" target="_blank" style="color: #ef4444; text-decoration: none; font-size: 0.85em; display: inline-flex; align-items: center; gap: 4px; margin-top: 5px;"><span class="material-icons-round" style="font-size: 1em;">play_circle</span> YouTube</a>` : ''}
                </div>
                <div style="text-align: right; font-size: 0.75em; color: #64748b;">
                    <p>${p.suggestedBy || ''}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Render Dashboard ---
function renderDashboard() {
    // Church name — from config, localStorage, or default
    const churchName = state.church.config?.churchName
        || localStorage.getItem('worship_church_name')
        || 'Mi Iglesia';
    const logoData = localStorage.getItem('worship_church_logo') || '';

    if (dashboardChurchName) dashboardChurchName.textContent = churchName;

    // Logo — big and prominent
    if (dashboardLogo) {
        if (logoData) {
            dashboardLogo.innerHTML = `
                <div style="width: 120px; height: 120px; margin: 0 auto; border-radius: 50%; overflow: hidden;
                            border: 3px solid var(--primary); box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);">
                    <img src="${logoData}" alt="Logo" style="width:100%; height:100%; object-fit:cover;">
                </div>`;
        } else {
            dashboardLogo.innerHTML = '<span class="material-icons-round" style="font-size: 4.5em; color: var(--primary); opacity: 0.5;">church</span>';
        }
    }

    // Church config inputs
    if (churchNameInput) churchNameInput.value = churchName !== 'Mi Iglesia' ? churchName : '';
    if (logoPreview && logoData) {
        logoPreview.innerHTML = `<img src="${logoData}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    // Team
    if (dashboardTeam) {
        const users = state.users || [];
        if (users.length === 0) {
            dashboardTeam.innerHTML = '<p style="color: var(--text-muted);">No hay miembros registrados.</p>';
        } else {
            const groups = { lider: [], musico: [], invitado: [] };
            users.forEach(u => {
                const role = u.role || 'invitado';
                if (!groups[role]) groups[role] = [];
                groups[role].push(u);
            });

            let html = '';
            if (groups.lider.length > 0) {
                html += `<div style="margin-bottom: 12px;">
                    <p style="font-weight: 600; color: #fbbf24; margin-bottom: 6px;">👑 Líder</p>
                    ${groups.lider.map(u => `<p style="color: white; padding-left: 10px;">• ${u.name || u.email}</p>`).join('')}
                </div>`;
            }
            if (groups.musico.length > 0) {
                html += `<div style="margin-bottom: 12px;">
                    <p style="font-weight: 600; color: #34d399; margin-bottom: 6px;">🎸 Músicos</p>
                    ${groups.musico.map(u => `<p style="color: white; padding-left: 10px;">• ${u.name || u.email}</p>`).join('')}
                </div>`;
            }
            if (groups.invitado.length > 0) {
                html += `<div style="margin-bottom: 12px;">
                    <p style="font-weight: 600; color: #94a3b8; margin-bottom: 6px;">🌱 Invitados</p>
                    ${groups.invitado.map(u => `<p style="color: white; padding-left: 10px;">• ${u.name || u.email}</p>`).join('')}
                </div>`;
            }
            dashboardTeam.innerHTML = html || '<p style="color: var(--text-muted);">No hay miembros.</p>';
        }
    }

    // Next Sunday
    if (dashboardSunday) {
        const sundays = state.sundays || [];
        const today = new Date().toISOString().split('T')[0];
        const upcoming = sundays.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
        const next = upcoming[0] || sundays[sundays.length - 1];

        if (next && next.songs && next.songs.length > 0) {
            const songNames = next.songs.map(id => {
                const song = state.songs.find(s => s.id === id);
                return song ? song.name : `ID ${id}`;
            });
            dashboardSunday.innerHTML = `
                <p style="color: var(--primary); font-weight: 500; margin-bottom: 8px;">📅 ${next.date}</p>
                ${songNames.map(n => `<p style="color: white; padding-left: 10px;">🎵 ${n}</p>`).join('')}
            `;
        } else {
            dashboardSunday.innerHTML = '<p style="color: var(--text-muted);">No hay domingo programado.</p>';
        }
    }

    // Stats
    if (statSongs) statSongs.textContent = (state.songs || []).length;
    if (statPending) statPending.textContent = (state.pending || []).length;
    if (statMembers) statMembers.textContent = (state.users || []).length;
}

// --- Render Users List (Líder only) ---
function renderUsersList() {
    if (!usersListContainer) return;

    const users = state.users || [];
    if (users.length === 0) {
        usersListContainer.innerHTML = '<p style="color: var(--text-muted);">No hay usuarios registrados.</p>';
        return;
    }

    usersListContainer.innerHTML = users.map((user, index) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; 
                    border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px;">
            <div style="flex: 1; min-width: 0;">
                <p style="color: white; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name || user.email}</p>
                <p style="font-size: 0.75em; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.email}</p>
            </div>
            <select class="search-input user-role-select" data-index="${index}" 
                    style="width: auto; min-width: 130px; padding: 8px 12px; font-size: 0.85em;">
                <option value="lider" ${user.role === 'lider' ? 'selected' : ''}>👑 Líder</option>
                <option value="musico" ${user.role === 'musico' ? 'selected' : ''}>🎸 Músico</option>
                <option value="invitado" ${user.role === 'invitado' ? 'selected' : ''}>🌱 Invitado</option>
            </select>
        </div>
    `).join('');

    // Attach change listeners
    usersListContainer.querySelectorAll('.user-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            const newRole = e.target.value;
            state.users[idx].role = newRole;

            if (state.users[idx].email.toLowerCase() === authState.userEmail.toLowerCase()) {
                actions.setUserRole(newRole);
                applyRolePermissions(newRole);
            }

            try {
                await api.saveUsers();
            } catch (err) {
                console.error('Error guardando roles:', err);
                alert('Error guardando cambios de rol.');
            }
        });
    });
}

// --- Auth Change Handler ---
async function handleAuthChange() {
    if (authState.isAuthenticated) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        if (userInfoDisplay) userInfoDisplay.textContent = authState.userEmail;

        if (configUserEmail) configUserEmail.textContent = authState.userEmail || '';
        if (sheetIdInput) sheetIdInput.value = state.church.id || '';

        if (state.church.id) {
            console.log('Cargando datos de iglesia:', state.church.id);
            await api.loadAll();
        } else {
            console.log('Usuario autenticado pero sin iglesia seleccionada.');
            applyRolePermissions('invitado');
        }

    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (authStatusText) authStatusText.textContent = 'Bienvenido. Inicia sesión para continuar.';
        if (manualAuthTrigger) manualAuthTrigger.style.display = 'block';
    }
}

// --- Image Compression Utility ---
function compressImage(file, maxSize, quality, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) {
                if (w > maxSize) { h = h * maxSize / w; w = maxSize; }
            } else {
                if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
