// CONFIGURACIÓN (Rellena esto con tus propias credenciales)
const CLIENT_ID = '317250130958-9umc39ki6fjtv3isjd5u6a4iqhjbquhp.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA0qFoeOwG7q14iEO-F91t3HnQ480AneUk';
// La hoja de cálculo se determina dinámicamente ahora
// const SPREADSHEET_ID = '...'; se elimina para usar localStorage
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

function getSpreadsheetId() {
    return localStorage.getItem('worship_manager_sheet_id') || '';
}

function setSpreadsheetId(id) {
    if (id) {
        localStorage.setItem('worship_manager_sheet_id', id.trim());
        // Forzar recarga limpia para tomar el nuevo ID
    } else {
        localStorage.removeItem('worship_manager_sheet_id');
    }
}

// Variables globales de estado (se usan en multiples archivos)
let songs = [];
let sundays = [];
let pendingSongs = [];
let learnedSongs = [];
let rehearsals = [];
let users = [];
let selectedRole = '';

// Usuario actual
let currentUser = {
    email: '',
    name: '',
    role: '',  // 'lider' o 'musico'
    isNew: false
};

// Estado temporal en memoria
let currentSundaySongs = [];
let currentSundayDate = null;
let currentRehearsalSongs = [];
let currentRehearsalDate = null;
let currentRehearsalTime = null;

// Configuración personalizable de roles y app
let appConfig = {
    churchName: 'Iglesia CCINT Buin',
    liderIcon: '👑', liderName: 'Líder',
    musicoIcon: '🎸', musicoName: 'Músico',
    invitadoIcon: '🌱', invitadoName: 'Invitado',
    logoBase64: ''
};

// Helpers de permisos
function isLider() { return currentUser.role === 'lider'; }
function isMusico() { return currentUser.role === 'musico'; }
function isInvitado() { return currentUser.role === 'invitado'; }

// Helpers de fecha
function formatDate(dateString) {
    if (!dateString) return '';
    // Agregar tiempo al mediodía para evitar problemas de zona horaria
    const date = new Date(dateString + 'T12:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}
