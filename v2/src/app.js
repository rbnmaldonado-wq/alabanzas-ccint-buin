import { initAuth, authState, onAuthChange, login, logout } from './auth.js';
import { state, actions, subscribe } from './state.js';
import { api } from './api.js';

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
    // 1. Cargar configuración local (ID de hoja)
    actions.loadFromStorage();

    // 2. Listeners UI
    manualLoginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);

    // 3. Suscribirse a cambios
    onAuthChange(handleAuthChange);
    subscribe('loading-start', (e) => console.log('Cargando:', e.detail.message));
    subscribe('data-loaded', renderApp);

    // 4. Iniciar Auth
    try {
        await initAuth();
    } catch (e) {
        console.error('Error fatal iniciando app:', e);
        authStatusText.textContent = 'Error iniciando sistema. Revisa consola.';
    }
});

async function handleAuthChange() {
    if (authState.isAuthenticated) {
        // Usuario logueado
        authOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
        userInfoDisplay.textContent = authState.userEmail;

        // Verificar si tenemos hoja conectada
        if (state.church.id) {
            console.log('Cargando datos de iglesia:', state.church.id);
            await api.loadAll();
        } else {
            // TODO: Mostrar selector de iglesia (Fase 4)
            console.log('Usuario autenticado pero sin iglesia seleccionada.');
            alert('Falta implementar selector de iglesia. Por ahora edita localStorage manual.');
        }

    } else {
        // Usuario desconectado
        authOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        authStatusText.textContent = 'Bienvenido. Inicia sesión para continuar.';
        manualAuthTrigger.style.display = 'block';
    }
}

function renderApp() {
    console.log('Renderizando App con datos!', state);
    // Aquí iría la lógica de renderizado de UI (Fase 4)
    const list = document.getElementById('songsList');
    if (list) {
        list.innerHTML = state.songs.map(s => `
            <div class="glass-card" style="padding: 15px;">
                <h3 style="color: var(--primary);">${s.name}</h3>
                <p style="color: #ccc; font-size: 0.9em;">${s.difficulty}</p>
            </div>
        `).join('');
    }
}
