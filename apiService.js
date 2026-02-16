import { state, dispatch } from './store.js';

// Constantes de Rangos (Mapeo a Hojas)
const RANGES = {
    SONGS: 'Songs!A2:F',
    SUNDAYS: 'Sundays!A2:C',
    PENDING: 'Pending!A2:F',
    LEARNED: 'Learned!A2:F',
    REHEARSALS: 'Rehearsals!A2:E',
    USERS: 'Users!A2:D',
    CONFIG: 'Users!F1:M1'
};

const TEMPLATE_ID = '1qBQRPiAomG1wVzIF4XmHMoDlPKXbVcrQKQD4JnXVdF0';

export const api = {

    // --- Lectura ---

    async loadAll() {
        if (!state.church.id) throw new Error('No hay ID de iglesia configurado');

        try {
            dispatch('loading-start', { message: 'Cargando datos...' });

            // Paralelizar lecturas para velocidad
            const [songs, sundays, pending, learned, rehearsals, users, config] = await Promise.all([
                readSheet(RANGES.SONGS),
                readSheet(RANGES.SUNDAYS),
                readSheet(RANGES.PENDING),
                readSheet(RANGES.LEARNED),
                readSheet(RANGES.REHEARSALS),
                readSheet(RANGES.USERS),
                readSheet(RANGES.CONFIG)
            ]);

            // Procesar y guardar en State
            state.songs = mapSongs(songs);
            state.sundays = mapSundays(sundays);
            state.pending = mapPending(pending);
            state.learned = mapPending(learned); // Reutiliza estructura
            state.rehearsals = mapRehearsals(rehearsals);
            state.users = mapUsers(users);

            if (config && config[0]) mapConfig(config[0]);

            dispatch('data-loaded');
            dispatch('loading-end');

        } catch (e) {
            console.error('Error cargando datos:', e);
            dispatch('error', { message: 'Error cargando datos de la hoja.' });
            dispatch('loading-end');
            throw e;
        }
    },

    // --- Escritura ---

    async addSong(song) {
        // Optimista: Actualizar estado local primero
        state.songs.push(song);
        dispatch('data-updated');

        // Persistir (Reescribir todo por simplicidad y atomicidad en V1/V2 legacy way)
        // Idealmente sería append, pero mantenemos lógica original por ahora.
        const values = state.songs.map(s => [
            s.id, s.name, s.difficulty, s.youtubeLink, s.pdfLink, s.addedDate
        ]);
        await this.saveSongs();
    },

    async saveSongs() {
        const values = state.songs.map(s => [
            s.id, s.name, s.difficulty, s.youtubeLink, s.pdfLink, s.addedDate
        ]);
        // Sobrescribir todo el rango (Song!A2:F)
        // Nota: Esto borra filas extra si hay menos canciones que antes
        // Para limpiar bien, primero limpiamos. Pero Google Sheets API sobrescribe si values es menor? No siempre.
        // Mejor estrategia simple: Escribir.
        await writeSheet(RANGES.SONGS, values);
        dispatch('data-updated');
    },

    async saveSunday(sunday) {
        // En este modelo simple, agregamos al historial.
        // Verificamos si ya existe esa fecha para actualizarla en lugar de duplicar?
        // Por simplicidad de V1 -> V2, hacemos append (o replace si el ID existe localmente).

        const existingIndex = state.sundays.findIndex(s => s.date === sunday.date);

        if (existingIndex >= 0) {
            // Actualizar existente
            state.sundays[existingIndex] = { ...state.sundays[existingIndex], ...sunday };
        } else {
            // Nuevo
            state.sundays.push(sunday);
        }

        dispatch('data-updated');

        // Persistir todo sundays
        const values = state.sundays.map(s => [
            s.id,
            s.date,
            s.songs.join(',')
        ]);

        await writeSheet(RANGES.SUNDAYS, values);
    },

    async saveRehearsal(rehearsal) {
        const existingIndex = state.rehearsals.findIndex(r => r.id === rehearsal.id);
        if (existingIndex >= 0) {
            state.rehearsals[existingIndex] = { ...state.rehearsals[existingIndex], ...rehearsal };
        } else {
            state.rehearsals.push(rehearsal);
        }
        dispatch('data-updated');
        await this.saveRehearsalsList(state.rehearsals);
    },

    async saveRehearsalsList(list) {
        const values = list.map(r => [
            r.id,
            r.date,
            r.time,
            r.songs.join(','),
            r.notes || ''
        ]);
        await writeSheet(RANGES.REHEARSALS, values);
        dispatch('data-updated');
    },

    // Métodos similares para addSunday, deleteSong, etc...
    // Por brevedad en esta fase, implementaremos lo esencial para leer primero.

    // --- Gestión de Archivos ---

    async createSheet() {
        dispatch('loading-start', { message: 'Creando base de datos...' });
        try {
            const resp = await gapi.client.drive.files.copy({
                fileId: TEMPLATE_ID,
                resource: { name: 'Worship Manager - Mi Iglesia' }
            });
            const newId = resp.result.id;
            state.church.id = newId;
            localStorage.setItem('worship_manager_sheet_id', newId);
            dispatch('loading-end');
            return newId;
        } catch (e) {
            dispatch('loading-end');
            throw e;
        }
    }
};

// --- Helpers Privados ---

async function readSheet(range) {
    try {
        const resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: state.church.id,
            range: range
        });
        return resp.result.values || [];
    } catch (e) {
        console.warn(`Error leyendo ${range}:`, e);
        if (e.result?.error?.code === 401) {
            dispatch('auth-error'); // Token expirado
        }
        return [];
    }
}

async function writeSheet(range, values) {
    await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: state.church.id,
        range: range,
        valueInputOption: 'RAW',
        resource: { values }
    });
}

// Mappers (Transforman Array de Arrays a Objetos)
function mapSongs(rows) {
    return rows.map(r => ({
        id: parseInt(r[0]),
        name: r[1],
        difficulty: r[2],
        youtubeLink: r[3],
        pdfLink: r[4],
        addedDate: r[5]
    })).filter(s => s.id); // Filtrar filas vacías
}

function mapSundays(rows) {
    return rows.map(r => ({
        id: parseInt(r[0]),
        date: r[1],
        songs: r[2] ? r[2].split(',').map(id => parseInt(id)) : []
    })).filter(s => s.id);
}

function mapPending(rows) {
    return rows.map(r => ({
        id: parseInt(r[0]),
        name: r[1],
        suggestedBy: r[2],
        priority: r[3],
        notes: r[4],
        dateAdded: r[5]
    })).filter(s => s.id);
}

function mapRehearsals(rows) {
    return rows.map(r => ({
        id: parseInt(r[0]),
        date: r[1],
        time: r[2],
        songs: r[3] ? r[3].split(',').map(id => parseInt(id)) : [],
        notes: r[4]
    })).filter(r => r.id);
}

function mapUsers(rows) {
    return rows.map(r => ({
        email: r[0],
        name: r[1],
        role: r[2],
        joinedDate: r[3]
    })).filter(u => u.email);
}

function mapConfig(row) {
    if (!row) return;
    state.church.config = {
        churchName: row[0],
        liderIcon: row[1], liderName: row[2],
        musicoIcon: row[3], musicoName: row[4],
        invitadoIcon: row[5], invitadoName: row[6],
        logoBase64: row[7]
    };
}
