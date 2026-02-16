import { state, dispatch } from './store.js';
import { api } from './api.js';

let elements = {};

export function initSundayUI() {
    elements = {
        container: document.getElementById('view-domingo'),
        dateInput: document.getElementById('sundayDateInput'),
        listContainer: document.getElementById('sundaySongList'),
        saveBtn: document.getElementById('saveSundayBtn'),
        // Selector area (needs to be injected or managed)
        // En v2/index.html definimos un div simple, vamos a inyectar el selector allí si no existe
    };

    if (elements.dateInput) {
        // Set default date to next Sunday
        if (!elements.dateInput.value) {
            elements.dateInput.valueAsDate = getNextSunday();
            updateCurrentSundayState();
        }
        elements.dateInput.addEventListener('change', updateCurrentSundayState);
    }

    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveSunday);
    }

    // Subscribe to events
    import('../state.js').then(({ subscribe }) => {
        subscribe('data-loaded', renderSundayUI);
        subscribe('data-updated', renderSundayUI); // Re-render if songs change (names, etc)
    });
}

function getNextSunday() {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()) % 7);
    return d;
}

function updateCurrentSundayState() {
    state.ui.sundayDate = elements.dateInput.value;
    // Check if this date already exists in history to load it?
    // For now, simple logic: current editing buffer.
    renderSundayUI();
}

export function renderSundayUI() {
    if (!state.ui.sundayDate) return;

    // 1. Render List of Selected Songs
    renderSelectedSongs();

    // 2. Render Song Selector (Add New)
    renderSelector();
}

function renderSelectedSongs() {
    const list = elements.listContainer;
    if (!list) return;

    const currentSongs = state.ui.sundaySongs || [];

    if (currentSongs.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                <p>No hay canciones seleccionadas.</p>
            </div>
        `;
    } else {
        list.innerHTML = currentSongs.map((songId, index) => {
            const song = state.songs.find(s => s.id === songId);
            if (!song) return ''; // Should not happen

            return `
                <div class="glass-card" style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 10px 15px; 
                    margin-bottom: 8px;
                    background: rgba(255,255,255,0.05);
                ">
                    <div style="display:flex; gap: 10px; align-items:center;">
                        <span style="font-weight:bold; color:var(--primary); font-family: monospace;">${index + 1}.</span>
                        <span>${song.name}</span>
                        <span style="font-size:0.8em; color:var(--text-muted); border:1px solid #444; padding: 0 4px; border-radius: 4px;">${song.difficulty}</span>
                    </div>
                    <button class="icon-btn" onclick="window.removeFromSunday(${index})" style="color: #ef4444;">
                        <span class="material-icons-round">remove_circle_outline</span>
                    </button>
                </div>
            `;
        }).join('');
    }
}

function renderSelector() {
    // Check if selector exists, if not create it
    let selector = document.getElementById('sundaySongAddSelect');
    if (!selector) {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '20px';
        wrapper.innerHTML = `
            <div style="display: flex; gap: 10px;">
                <select id="sundaySongAddSelect" class="search-input" style="flex:1;">
                    <option value="">+ Agregar alabanza...</option>
                </select>
                <button id="addSongToSundayBtn" class="btn-primary">Agregar</button>
            </div>
        `;
        // Append after list
        elements.listContainer.parentNode.insertBefore(wrapper, elements.saveBtn.parentNode); // Insert before save button container

        selector = document.getElementById('sundaySongAddSelect');
        document.getElementById('addSongToSundayBtn').addEventListener('click', () => {
            const id = parseInt(selector.value);
            if (id) {
                if (!state.ui.sundaySongs) state.ui.sundaySongs = [];
                state.ui.sundaySongs.push(id);
                renderSundayUI();
                selector.value = ""; // Reset
            }
        });
    }

    // Populate options
    // Filter out songs already selected? Maybe not, allow duplicates? Usually not.
    const selectedSet = new Set(state.ui.sundaySongs || []);

    // Sort alphabetically
    const sortedSongs = [...state.songs].sort((a, b) => a.name.localeCompare(b.name));

    selector.innerHTML = '<option value="">+ Agregar alabanza...</option>' +
        sortedSongs.map(s => `
            <option value="${s.id}" ${selectedSet.has(s.id) ? 'disabled' : ''}>
                ${s.name}
            </option>
        `).join('');
}

async function saveSunday() {
    const date = elements.dateInput.value;
    const songs = state.ui.sundaySongs || [];

    if (!date) {
        alert("Selecciona una fecha.");
        return;
    }
    if (songs.length === 0) {
        if (!confirm("¿Guardar servicio vacío?")) return;
    }

    try {
        await api.saveSunday({
            id: Date.now(), // New entry, simplistic approach. Ideally check if exists.
            date: date,
            songs: songs
        });
        alert("Servicio guardado en el historial.");
        // Clear?
        // state.ui.sundaySongs = [];
        // renderSundayUI();
    } catch (e) {
        console.error(e);
        alert("Error guardando servicio.");
    }
}

// Global exposure for onclick
window.removeFromSunday = (index) => {
    if (state.ui.sundaySongs) {
        state.ui.sundaySongs.splice(index, 1);
        renderSundayUI();
    }
};
