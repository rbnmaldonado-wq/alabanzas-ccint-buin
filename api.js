// Actualizar indicador de sincronización
function updateSyncStatus(status, text) {
    const indicator = document.getElementById('syncIndicator');
    const statusText = document.getElementById('syncText');

    if (indicator && statusText) {
        indicator.className = `sync-indicator ${status}`;
        statusText.textContent = text;
    }
}

// Leer datos de Google Sheets
// ID de la Plantilla Maestra (pública)
const TEMPLATE_ID = '1qBQRPiAomG1wVzIF4XmHMoDlPKXbVcrQKQD4JnXVdF0';

async function createChurchSheet() {
    try {
        updateSyncStatus('syncing', 'Creando base de datos...');

        const response = await gapi.client.drive.files.copy({
            fileId: TEMPLATE_ID,
            resource: {
                name: 'Worship Manager - Mi Iglesia',
            },
        });

        const newFileId = response.result.id;
        console.log('Nueva hoja creada:', newFileId);
        return newFileId;
    } catch (error) {
        console.error('Error creando hoja:', error);
        // Mostrar mensaje técnico para depuración
        const errorMsg = error.result?.error?.message || error.message || JSON.stringify(error);
        alert(`❌ Error al crear la hoja:\n${errorMsg}\n\nPosibles causas:\n1. API Key restringida (solo Sheets?)\n2. API Drive no habilitada`);
        throw error;
    }
}

async function readSheet(range) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: getSpreadsheetId(),
            range: range,
        });
        return response.result.values || [];
    } catch (error) {
        console.error('Error leyendo:', error);
        if (error.result && (error.result.error.code === 401 || error.result.error.code === 403)) {
            console.warn('Token expirado o inválido. Cerrando sesión...');
            localStorage.removeItem('gapi_token');
            location.reload();
        }
        return [];
    }
}

// Escribir datos en Google Sheets
async function writeSheet(range, values) {
    try {
        updateSyncStatus('syncing', 'Guardando...');

        // Asegurarse de que gapi esté listo
        if (!gapi.client || !gapi.client.sheets) {
            throw new Error('API no inicializada');
        }

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: getSpreadsheetId(),
            range: range,
            valueInputOption: 'RAW',
            resource: { values: values },
        });
        updateSyncStatus('synced', 'Sincronizado');
        return true;
    } catch (error) {
        console.error('Error escribiendo:', error);

        // Reintentar una vez después de 1 segundo
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: range,
                valueInputOption: 'RAW',
                resource: { values: values },
            });
            updateSyncStatus('synced', 'Sincronizado');
            return true;
        } catch (retryError) {
            console.error('Error en reintento:', retryError);
            updateSyncStatus('error', 'Error al guardar');
            throw retryError;
        }
    }
}

// Cargar todos los datos
async function loadAllData() {
    updateSyncStatus('syncing', 'Cargando...');

    const songsData = await readSheet('Songs!A2:F');
    songs = songsData.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        name: row[1] || '',
        difficulty: row[2] || 'No especificada',
        youtubeLink: row[3] || '',
        pdfLink: row[4] || '',
        addedDate: row[5] || new Date().toISOString()
    }));

    const sundaysData = await readSheet('Sundays!A2:C');
    sundays = sundaysData.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        date: row[1] || '',
        songs: row[2] ? row[2].split(',').map(id => parseInt(id)) : []
    }));

    const pendingData = await readSheet('Pending!A2:F');
    pendingSongs = pendingData.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        name: row[1] || '',
        suggestedBy: row[2] || 'Anónimo',
        priority: row[3] || 'Media',
        notes: row[4] || '',
        dateAdded: row[5] || new Date().toISOString()
    }));

    const learnedData = await readSheet('Learned!A2:F');
    learnedSongs = learnedData.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        name: row[1] || '',
        suggestedBy: row[2] || 'Anónimo',
        priority: row[3] || 'Media',
        notes: row[4] || '',
        learnedDate: row[5] || new Date().toISOString()
    }));

    const rehearsalsData = await readSheet('Rehearsals!A2:E');
    rehearsals = rehearsalsData.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        date: row[1] || '',
        time: row[2] || '',
        songs: row[3] ? row[3].split(',').map(id => parseInt(id)) : [],
        notes: row[4] || ''
    }));

    // Cargar usuarios
    const usersData = await readSheet('Users!A2:D');
    users = usersData.filter(row => row[0]).map(row => ({
        email: row[0] || '',
        name: row[1] || '',
        role: row[2] || 'musico',
        joinedDate: row[3] || ''
    }));

    // Cargar configuración (guardada en Users!F1:L1)
    try {
        const configData = await readSheet('Users!F1:M1');
        if (configData && configData[0] && configData[0][0]) {
            const c = configData[0];
            appConfig = {
                churchName: c[0] || appConfig.churchName,
                liderIcon: c[1] || appConfig.liderIcon,
                liderName: c[2] || appConfig.liderName,
                musicoIcon: c[3] || appConfig.musicoIcon,
                musicoName: c[4] || appConfig.musicoName,
                invitadoIcon: c[5] || appConfig.invitadoIcon,
                invitadoName: c[6] || appConfig.invitadoName,
                logoBase64: c[7] || ''
            };
        }
    } catch (e) { }

    updateStats();
    renderSongs();
    updateSongSelector();
    renderHistory();
    renderPendingSongs();
    renderLearnedSongs();
    renderRehearsalHistory();
    updateRehearsalSelector();
    applyConfigToUI();

    updateSyncStatus('synced', 'Sincronizado');
}

async function saveSongs() {
    const values = songs.map(song => [
        song.id,
        song.name,
        song.difficulty,
        song.youtubeLink || '',
        song.pdfLink || '',
        song.addedDate
    ]);
    await writeSheet('Songs!A2:F', values);
}

async function saveSundays() {
    const values = sundays.map(sunday => [
        sunday.id,
        sunday.date,
        sunday.songs.join(',')
    ]);
    await writeSheet('Sundays!A2:C', values);
}

async function savePendingSongsData() {
    const values = pendingSongs.map(song => [
        song.id,
        song.name,
        song.suggestedBy,
        song.priority,
        song.notes || '',
        song.dateAdded
    ]);
    await writeSheet('Pending!A2:F', values);
}

async function saveLearnedSongsData() {
    const values = learnedSongs.map(song => [
        song.id,
        song.name,
        song.suggestedBy,
        song.priority,
        song.notes || '',
        song.learnedDate
    ]);
    await writeSheet('Learned!A2:F', values);
}

async function saveRehearsals() {
    const values = rehearsals.map(rehearsal => [
        rehearsal.id,
        rehearsal.date,
        rehearsal.time,
        rehearsal.songs.join(','),
        rehearsal.notes || ''
    ]);
    await writeSheet('Rehearsals!A2:E', values);
}

async function saveUsers() {
    const values = users.length > 0 ? users.map(u => [
        u.email, u.name, u.role, u.joinedDate
    ]) : [['', '', '', '']];
    await writeSheet('Users!A2:D', values);
}
