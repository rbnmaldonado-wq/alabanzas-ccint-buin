import { state, dispatch, actions } from './store.js';
import { api } from './apiService.js';

// Cache DOM elements
let elements = {};

export function initSongsUI() {
    elements = {
        listContainer: document.getElementById('songsList'),
        searchInput: document.getElementById('searchInput'),
        addBtn: document.getElementById('addSongBtn'),
        modal: document.getElementById('songModal'),
        form: document.getElementById('songForm'),
        closeModalBtn: document.getElementById('closeSongModal'),
        cancelModalBtn: document.getElementById('cancelSongModalBtn'),
        // Form inputs
        nameInput: document.getElementById('modalSongName'),
        difficultyInput: document.getElementById('modalSongDifficulty'),
        youtubeInput: document.getElementById('modalSongYoutube'),
        docInput: document.getElementById('modalSongDoc')
    };

    // Listeners
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keyup', (e) => filterSongs(e.target.value));
    }

    if (elements.addBtn) {
        elements.addBtn.addEventListener('click', () => openModal());
    }

    if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
    if (elements.cancelModalBtn) elements.cancelModalBtn.addEventListener('click', closeModal);

    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmit);
    }

    // Subscribe to state changes
    // Cuando carguen los datos o se actualicen, re-renderizar
    const renderCallback = () => {
        if (state.ui.currentView === 'repertorio') renderSongsList();
    };

    // Escuchar eventos del bus
    // (Asumimos que state.js emite 'data-loaded' y 'data-updated')
    // Nota: state.js usa EventTarget, así que usamos el helper subscribe que exportamos o addEventListener directo si tenemos acceso al bus.
    // Revisando store.js, exportamos 'subscribe'.
}

// Subscribe globalmente al cambio de datos para re-renderizar si estamos en esta vista
import { subscribe } from './store.js';
subscribe('data-loaded', () => renderSongsList());
subscribe('data-updated', () => renderSongsList());


/* =========================================
   LOGIC: RENDER
   ========================================= */

export function renderSongsList(filterText = '') {
    if (!elements.listContainer) return;

    const songs = state.songs || [];
    const term = filterText.toLowerCase();

    // Filtrar
    const filtered = songs.filter(s =>
        s.name.toLowerCase().includes(term) ||
        (s.artist && s.artist.toLowerCase().includes(term))
    );

    // Empty State
    if (filtered.length === 0) {
        elements.listContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 3em; margin-bottom: 10px; opacity:0.5;">🎵</div>
                <p>No se encontraron alabanzas.</p>
                ${songs.length === 0 ? '<p>Agrega la primera usando el botón "Nueva".</p>' : ''}
            </div>
        `;
        return;
    }

    // Render Grid
    elements.listContainer.innerHTML = filtered.map(song => createSongCard(song)).join('');
}

function createSongCard(song) {
    // Badges
    let diffColor = '#2dd4bf'; // Default
    if (song.difficulty === 'Baja') diffColor = '#22c55e';
    if (song.difficulty === 'Media') diffColor = '#f59e0b';
    if (song.difficulty === 'Alta') diffColor = '#ef4444';

    const difficultyBadge = `<span style="
        font-size: 0.75em; 
        padding: 2px 8px; 
        border-radius: 10px; 
        background: ${diffColor}22; 
        color: ${diffColor}; 
        border: 1px solid ${diffColor}44;
    ">${song.difficulty || 'Media'}</span>`;

    // Actions
    // TODO: Check permissions (isLider) from State
    // Por ahora asumimos que todos pueden editar si ven el botón (protección UI luego)

    return `
        <div class="glass-card song-card" style="padding: 15px; position: relative; transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="font-size: 1.5em; opacity: 0.8;">🎶</div>
                ${difficultyBadge}
            </div>
            
            <h3 style="margin: 0 0 5px 0; font-size: 1.1em; color: white;">${song.name}</h3>
            
            <div style="margin-top: 15px; display: flex; gap: 8px;">
                ${song.youtubeLink ? `
                    <a href="${song.youtubeLink}" target="_blank" class="icon-btn" style="color:#ef4444; text-decoration:none;">
                        <span class="material-icons-round">play_circle</span>
                    </a>
                ` : ''}
                ${song.docLink ? `
                    <a href="${song.docLink}" target="_blank" class="icon-btn" style="color:#60a5fa; text-decoration:none;">
                        <span class="material-icons-round">description</span>
                    </a>
                ` : ''}
            </div>
            
            <div style="position: absolute; bottom: 15px; right: 15px; display: flex; gap: 5px;">
                 <button class="icon-btn" onclick="window.editSong(${song.id})" style="color: #94a3b8;">
                    <span class="material-icons-round" style="font-size: 1.2em;">edit</span>
                 </button>
            </div>
        </div>
    `;
}

function filterSongs(text) {
    renderSongsList(text);
}


/* =========================================
   LOGIC: MODAL & CRUD
   ========================================= */

// Estado local del modal (id de canción siendo editada, null si es nueva)
let editingSongId = null;

function openModal(song = null) {
    editingSongId = song ? song.id : null;

    // Llenar form
    elements.nameInput.value = song ? song.name : '';
    elements.difficultyInput.value = song ? song.difficulty : 'Media';
    elements.youtubeInput.value = song ? song.youtubeLink : '';
    elements.docInput.value = song ? (song.docLink || '') : '';

    // Mostrar
    elements.modal.style.display = 'flex';
    elements.nameInput.focus();
}

function closeModal() {
    elements.modal.style.display = 'none';
    elements.form.reset();
    editingSongId = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const name = elements.nameInput.value.trim();
    if (!name) return;

    // Construct Object
    const songData = {
        id: editingSongId || Date.now(),
        name: name,
        difficulty: elements.difficultyInput.value,
        youtubeLink: elements.youtubeInput.value.trim(),
        docLink: elements.docInput.value.trim(),
        addedDate: editingSongId ? undefined : new Date().toISOString() // Mantener fecha original si editamos
    };

    // Si editamos, necesitamos recuperar la fecha original si no queremos perderla
    if (editingSongId) {
        const original = state.songs.find(s => s.id === editingSongId);
        if (original) songData.addedDate = original.addedDate;
    }

    try {
        closeModal(); // UX optimista inmediata

        if (editingSongId) {
            // Update
            const index = state.songs.findIndex(s => s.id === editingSongId);
            if (index !== -1) {
                state.songs[index] = { ...state.songs[index], ...songData };
                await api.saveSongs(); // Save to cloud
            }
        } else {
            // Create
            await api.addSong(songData);
        }

    } catch (err) {
        console.error("Error saving song:", err);
        alert("Error guardando cambios. Revisa la consola.");
    }
}

// Exponer globalmente para los onclick del HTML (chapuza temporal necesaria)
window.editSong = (id) => {
    const song = state.songs.find(s => s.id === id);
    if (song) openModal(song);
};
