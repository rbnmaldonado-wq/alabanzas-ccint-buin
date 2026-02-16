import { CONFIG } from './configService.js';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Estado interno del módulo de Auth
export const authState = {
    isAuthenticated: false,
    userEmail: null,
    userName: null,
    tokenExpiresAt: 0
};

// Eventos para notificar al resto de la app
const authEvents = new EventTarget();

export function onAuthChange(callback) {
    authEvents.addEventListener('auth-changed', callback);
}

function notifyAuthChange() {
    authEvents.dispatchEvent(new Event('auth-changed'));
}

export async function initAuth() {
    console.log('Inicializando Auth v2...');

    // 1. Cargar librerías de Google dinámicamente
    await Promise.all([loadGapi(), loadGis()]);

    console.log('Librerías cargadas. Verificando sesión almacenada...');

    // 2. Intentar restaurar sesión
    const restored = restoreSession();
    if (restored) {
        console.log('Sesión restaurada. Usuario:', authState.userEmail);
        authState.isAuthenticated = true;
        notifyAuthChange();
    } else {
        console.log('No hay sesión válida. Esperando login de usuario.');
        notifyAuthChange(); // Notificar que estamos desconectados
    }
}

function loadGapi() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: CONFIG.API_KEY,
                    discoveryDocs: CONFIG.DISCOVERY_DOCS,
                });
                gapiInited = true;
                resolve();
            });
        };
        document.head.appendChild(script);
    });
}

function loadGis() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: (resp) => {
                    if (resp.error) {
                        console.error('Error Auth:', resp);
                        return;
                    }
                    handleTokenResponse(resp);
                },
            });
            gisInited = true;
            resolve();
        };
        document.head.appendChild(script);
    });
}

export function login() {
    if (!gisInited) {
        console.error('GIS no inicializado aún');
        return;
    }

    // Forzar selección de cuenta para evitar bucles raros
    tokenClient.requestAccessToken({ prompt: 'select_account' });
}

export function logout() {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => { });
    }
    gapi.client.setToken(null);
    localStorage.removeItem('gapi_token_v2');
    localStorage.removeItem('user_info_v2');

    authState.isAuthenticated = false;
    authState.userEmail = null;
    authState.userName = null;
    notifyAuthChange();
    location.reload(); // Recarga limpia para limpiar estado en memoria
}

function handleTokenResponse(tokenResponse) {
    // 1. Establecer token en gapi
    gapi.client.setToken(tokenResponse);

    // 2. Calcular expiración (normalmente 3599 segundos)
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

    // 3. Obtener info de usuario (decodificando/hint o si ya la teníamos)
    // Nota: El Token Client de OAuth2 NO devuelve info de user (email/name) directamente como el ID Token.
    // Usaremos un 'hack' seguro: pedir info a la API de Drive/Sheets o usar el hint si existe.
    // Para simplificar, asumiremos que si llegamos aquí, el usuario aprobó.

    // Vamos a intentar obtener el email del token si es posible, o pedirle al usuario que se identifique luego.
    // O mejor: Usar Google Identity Services (One Tap/Sign In Button) para autenticación + Token Client para autorización.
    // Pero para mantenerlo simple y robusto (como pidió el usuario), usaremos solo Token Client.
    // Podemos obtener el email haciendo una llamada rápida a Drive 'about'.

    fetchUserEmail().then(email => {
        authState.userEmail = email;
        authState.isAuthenticated = true;
        authState.tokenExpiresAt = expiresAt;

        saveSession(tokenResponse, email, expiresAt);
        notifyAuthChange();
    });
}

async function fetchUserEmail() {
    try {
        // Truco: obtener info del 'about' de Drive para saber quién soy
        const resp = await gapi.client.drive.about.get({ fields: 'user' });
        return resp.result.user.emailAddress;
    } catch (e) {
        console.warn('No se pudo obtener email:', e);
        return 'Usuario';
    }
}

function saveSession(token, email, expiresAt) {
    const session = {
        token: token,
        email: email,
        expiresAt: expiresAt
    };
    localStorage.setItem('gapi_token_v2', JSON.stringify(session));
}

function restoreSession() {
    const stored = localStorage.getItem('gapi_token_v2');
    if (!stored) return false;

    try {
        const session = JSON.parse(stored);
        if (Date.now() >= session.expiresAt) {
            console.log('Sesión expirada');
            localStorage.removeItem('gapi_token_v2');
            return false;
        }

        gapi.client.setToken(session.token);
        authState.userEmail = session.email;
        authState.tokenExpiresAt = session.expiresAt;
        return true;
    } catch (e) {
        return false;
    }
}
