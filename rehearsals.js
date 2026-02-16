import { state, dispatch } from './state.js';
import { api } from './api.js';

let elements = {};

export function initRehearsalsUI() {
    elements = {
        container: document.getElementById('view-ensayos')
    };

    if (!elements.container) return;

    // Initial Render of the main layout for Rehearsals
    renderLayout();

    // Subscribe to events
    import('../state.js').then(({ subscribe }) => {
        subscribe('data-loaded', renderRehearsalsList);
        subscribe('data-updated', renderRehearsalsList);
    });
}

function renderLayout() {
    elements.container.innerHTML = `
        <div class="action-bar" style="margin-bottom: 20px;">
            <h2 class="text-glow">Próximos Ensayos</h2>
            <button id="newRehearsalBtn" class="btn-primary">
                + Programar Ensayo
            </button>
        </div>

        <!-- Form PROGRAMAR (Hidden by default) -->
        <div id="rehearsalFormCard" class="glass-card" style="padding: 20px; margin-bottom: 20px; display: none;">
            <h3>Nuevo Ensayo</h3>
            <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                <input type="date" id="rehDateInput" class="search-input" style="flex: 1;">
                <input type="time" id="rehTimeInput" class="search-input" style="flex: 1;">
            </div>
            <div style="margin-top: 10px; text-align: right;">
                <button id="cancelRehBtn" class="btn-danger" style="background: transparent; border: 1px solid #ef4444; margin-right: 10px;">Cancelar</button>
                <button id="saveRehBtn" class="btn-primary">Guardar</button>
            </div>
        </div>

        <!-- LISTADO -->
        <div id="rehearsalsListContainer" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                Cargando ensayos...
            </div>
        </div>
    `;

    // Bind Layout Events
    document.getElementById('newRehearsalBtn').addEventListener('click', () => {
        document.getElementById('rehearsalFormCard').style.display = 'block';
    });

    document.getElementById('cancelRehBtn').addEventListener('click', () => {
        document.getElementById('rehearsalFormCard').style.display = 'none';
        clearForm();
    });

    document.getElementById('saveRehBtn').addEventListener('click', createRehearsal);
}

function renderRehearsalsList() {
    const listContainer = document.getElementById('rehearsalsListContainer');
    if (!listContainer) return;

    const rehearsals = state.rehearsals || [];

    if (rehearsals.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3em; opacity: 0.5;">🎸</div>
                <p>No hay ensayos programados.</p>
            </div>
        `;
        return;
    }

    // Sort by Date (newest first? or closest upcoming first? Usually closest upcoming)
    // Let's split into Upcoming and Past
    const now = new Date();
    const upcoming = [];
    const past = [];

    rehearsals.forEach(r => {
        // Safe date parsing
        const dateStr = r.date + 'T' + (r.time || '00:00');
        const d = new Date(dateStr);
        if (d >= now) upcoming.push(r);
        else past.push(r);
    });

    // Sort upcoming: closest first
    upcoming.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    // Sort past: newest first
    past.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));

    let html = '';

    if (upcoming.length > 0) {
        html += `<h3 style="color: #22c55e; border-bottom: 1px solid #22c55e; padding-bottom: 5px; margin-bottom: 15px;">Próximos</h3>`;
        html += upcoming.map(r => renderRehearsalItem(r)).join('');
    }

    if (past.length > 0) {
        html += `<h3 style="color: #94a3b8; border-bottom: 1px solid #94a3b8; padding-bottom: 5px; margin: 30px 0 15px 0;">Anteriores</h3>`;
        html += past.map(r => renderRehearsalItem(r, true)).join('');
    }

    listContainer.innerHTML = html;
}

function renderRehearsalItem(r, isPast = false) {
    // Map songs IDs to names
    const songNames = (r.songs || []).map(id => {
        const s = state.songs.find(x => x.id === id);
        return s ? s.name : 'Unknown';
    });

    return `
        <div class="glass-card" style="padding: 15px; border-left: 4px solid ${isPast ? '#64748b' : '#22c55e'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 1.1em; color: white;">
                        ${new Date(r.date).toLocaleDateString()}
                    </strong>
                    <span style="color: var(--primary); margin-left: 10px;">⏰ ${r.time}</span>
                </div>
                <div>
                     <!-- Actions could go here (Edit/Delete) -->
                     <button class="icon-btn" onclick="window.deleteRehearsal(${r.id})" style="color: #ef4444;" title="Eliminar">
                        <span class="material-icons-round">delete</span>
                     </button>
                </div>
            </div>
            
            <div style="margin-top: 10px;">
                ${songNames.length > 0 ?
            songNames.map(name => `<span style="display: inline-block; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.9em; margin-right: 5px; margin-bottom: 5px;">${name}</span>`).join('')
            : '<span style="color: var(--text-muted); font-size: 0.9em;">Sin canciones asignadas</span>'}
            </div>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 10px;">
                <select id="reh_add_${r.id}" class="search-input" style="padding: 5px; font-size: 0.9em;">
                    <option value="">+ Agregar canción</option>
                    ${state.songs.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <button class="btn-primary" style="padding: 5px 10px; font-size: 0.9em;" onclick="window.addSongToRehearsal(${r.id})">Agregar</button>
            </div>
        </div>
    `;
}

async function createRehearsal() {
    const date = document.getElementById('rehDateInput').value;
    const time = document.getElementById('rehTimeInput').value;

    if (!date || !time) {
        alert("Fecha y hora requeridas");
        return;
    }

    const newReh = {
        id: Date.now(),
        date,
        time,
        songs: [],
        notes: ''
    };

    try {
        await api.saveRehearsal(newReh);
        document.getElementById('rehearsalFormCard').style.display = 'none';
        clearForm();
    } catch (e) {
        console.error(e);
        alert("Error creando ensayo");
    }
}

function clearForm() {
    document.getElementById('rehDateInput').value = '';
    document.getElementById('rehTimeInput').value = '';
}

// Global actions exposed for onclick
window.deleteRehearsal = async (id) => {
    if (!confirm("¿Eliminar este ensayo?")) return;
    try {
        // Filter out from state
        const index = state.rehearsals.findIndex(r => r.id === id);
        if (index !== -1) {
            state.rehearsals.splice(index, 1);
            // We need a delete API or just save the whole list.
            // Our api.js patterns usually append/update single items or save whole lists.
            // saveRehearsals(list) is better.
            await api.saveRehearsalsList(state.rehearsals);
        }
    } catch (e) {
        console.error(e);
        alert("Error eliminando");
    }
};

window.addSongToRehearsal = async (rehId) => {
    const select = document.getElementById(`reh_add_${rehId}`);
    if (!select) return;
    const songId = parseInt(select.value);
    if (!songId) return;

    const reh = state.rehearsals.find(r => r.id === rehId);
    if (reh) {
        if (!reh.songs) reh.songs = [];
        if (!reh.songs.includes(songId)) {
            reh.songs.push(songId);
            await api.saveRehearsal(reh);
        }
    }
};
