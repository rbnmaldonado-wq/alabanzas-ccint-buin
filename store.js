// Estado Global de la Aplicación
// Centraliza todas las variables que antes estaban dispersas en window

export const state = {
    // Datos de la Iglesia
    church: {
        id: null, // Spreadsheet ID
        name: 'Iglesia',
        config: {
            liderIcon: '👑', liderName: 'Líder',
            musicoIcon: '🎸', musicoName: 'Músico',
            invitadoIcon: '🌱', invitadoName: 'Invitado',
            logoBase64: ''
        }
    },

    // Datos de Negocio
    songs: [],
    sundays: [],
    pending: [],
    learned: [],
    rehearsals: [],
    users: [],

    // Estado de UI
    ui: {
        isLoading: false,
        currentView: 'repertorio',
        sundayDate: null,
        sundaySongs: [], // IDs temporales antes de guardar
        userRole: 'invitado', // lider | musico | invitado
    }
};

// Event Bus simple para notificar cambios de estado
const stateEvents = new EventTarget();

export function subscribe(event, callback) {
    stateEvents.addEventListener(event, callback);
}

export function dispatch(event, detail = {}) {
    stateEvents.dispatchEvent(new CustomEvent(event, { detail }));
}

// Getters helpers
export const get = {
    songs: () => state.songs,
    song: (id) => state.songs.find(s => s.id === id),
    isLider: (email) => {
        const user = state.users.find(u => u.email === email);
        return user && user.role === 'lider';
    }
};

// Actions (Mutations)
export const actions = {
    setChurchId: (id) => {
        state.church.id = id;
        localStorage.setItem('worship_manager_sheet_id', id);
        dispatch('church-changed', { id });
    },

    loadFromStorage: () => {
        const savedId = localStorage.getItem('worship_manager_sheet_id');
        if (savedId) state.church.id = savedId;
    },

    setUserRole: (role) => {
        state.ui.userRole = role;
        dispatch('role-changed', { role });
    }
};
