import { initAuth, authState, onAuthChange, login, logout } from './authService.js';
import { state, actions, subscribe } from './store.js';
import { api } from './api.js';
import { initSongsUI, renderSongsList } from './songs.js';
import { initSundayUI } from './sunday.js';
import { initRehearsalsUI } from './rehearsals.js'; // Fase siguiente

// Elementos UI
const authOverlay = document.getElementById('authOverlay');
const authStatusText = document.getElementById('authStatusText');
const manualLoginBtn = document.getElementById('manualLoginBtn');
const manualAuthTrigger = document.getElementById('manualAuthTrigger');
const appContainer = document.getElementById('appContainer');
const userInfoDisplay = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar configuración local
    actions.loadFromStorage();

    // 2. Listeners UI Globales
    if (manualLoginBtn) manualLoginBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Inicializar Módulos UI
    initSongsUI();
    initSundayUI();
    initRehearsalsUI();

    // 3. Suscribirse a cambios
    onAuthChange(handleAuthChange);
    subscribe('loading-start', (e) => console.log('Cargando:', e.detail.message));
    subscribe('data-loaded', () => {
        console.log('Datos cargados. Renderizando UI...');
        renderSongsList(); // Render inicial
    });

    // 4. Iniciar Auth
    try {
        await initAuth();
    } catch (e) {
        console.error('Error fatal iniciando app:', e);
        if (authStatusText) authStatusText.textContent = 'Error iniciando sistema. Revisa consola.';
    }
});

async function handleAuthChange() {
    if (authState.isAuthenticated) {
        // Usuario logueado
        if (authOverlay) authOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        if (userInfoDisplay) userInfoDisplay.textContent = authState.userEmail;

        // Verificar si tenemos hoja conectada
        if (state.church.id) {
            console.log('Cargando datos de iglesia:', state.church.id);
            await api.loadAll();
        } else {
            console.log('Usuario autenticado pero sin iglesia seleccionada.');
            // Aquí deberíamos mostrar el selector de iglesia si no hay ID
            // Por ahora, asumimos que el usuario ya lo tiene o lo pondrá en configuración
        }

    } else {
        // Usuario desconectado
        if (authOverlay) authOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (authStatusText) authStatusText.textContent = 'Bienvenido. Inicia sesión para continuar.';
        if (manualAuthTrigger) manualAuthTrigger.style.display = 'block';
    }
}
