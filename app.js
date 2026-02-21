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
            } catch (e) {
                console.error('Error cargando datos con nuevo ID:', e);
                alert('Error cargando datos. Verifica que el ID sea correcto.');
            }
        });
    }

    // 5. Inicializar Módulos UI
    initSongsUI();
    initSundayUI();
    initRehearsalsUI();

    // 6. Suscribirse a cambios
    onAuthChange(handleAuthChange);
    subscribe('loading-start', (e) => console.log('Cargando:', e.detail.message));
    subscribe('data-loaded', () => {
        console.log('Datos cargados. Renderizando UI...');
        renderSongsList(); // Render inicial
    });

    // 7. Iniciar Auth
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
            const title = item.getAttribute('data-title');

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

// --- Auth Change Handler ---
async function handleAuthChange() {
    if (authState.isAuthenticated) {
        // Usuario logueado
        if (authOverlay) authOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        if (userInfoDisplay) userInfoDisplay.textContent = authState.userEmail;

        // Actualizar Configuración
        if (configUserEmail) configUserEmail.textContent = authState.userEmail || '';
        if (sheetIdInput) sheetIdInput.value = state.church.id || '';

        // Verificar si tenemos hoja conectada
        if (state.church.id) {
            console.log('Cargando datos de iglesia:', state.church.id);
            await api.loadAll();
        } else {
            console.log('Usuario autenticado pero sin iglesia seleccionada.');
        }

    } else {
        // Usuario desconectado
        if (authOverlay) authOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (authStatusText) authStatusText.textContent = 'Bienvenido. Inicia sesión para continuar.';
        if (manualAuthTrigger) manualAuthTrigger.style.display = 'block';
    }
}

