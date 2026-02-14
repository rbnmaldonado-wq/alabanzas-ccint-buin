// APP.JS - Lógica principal y control

async function addSong() {
    if (!isLider()) { alert('⛔ Solo el Líder puede agregar alabanzas.'); return; }
    const name = document.getElementById('songName').value.trim();
    const difficulty = document.getElementById('songDifficulty').value;
    const youtubeLink = document.getElementById('songYouTube').value.trim();
    const pdfLink = document.getElementById('songPDF').value.trim();

    if (!name) {
        alert('Por favor escribe el nombre de la alabanza');
        return;
    }

    const song = {
        id: Date.now(),
        name: name,
        difficulty: difficulty || 'No especificada',
        youtubeLink: youtubeLink,
        pdfLink: pdfLink,
        addedDate: new Date().toISOString()
    };

    songs.push(song);
    await saveSongs();

    document.getElementById('songName').value = '';
    document.getElementById('songDifficulty').value = '';
    document.getElementById('songYouTube').value = '';
    document.getElementById('songPDF').value = '';

    updateStats();
    renderSongs();
    updateSongSelector();
}

async function deleteSong(id) {
    if (!isLider()) { alert('⛔ Solo el Líder puede eliminar alabanzas.'); return; }
    if (confirm('¿Seguro que quieres eliminar esta alabanza?')) {
        songs = songs.filter(s => s.id !== id);
        await saveSongs();
        updateStats();
        renderSongs();
        updateSongSelector();
    }
}

async function editSong(id) {
    if (!isLider()) { alert('⛔ Solo el Líder puede editar alabanzas.'); return; }
    const song = songs.find(s => s.id === id);
    if (!song) return;

    const newName = prompt('Nombre de la alabanza:', song.name);
    if (newName === null) return;

    const newYouTube = prompt('Link de YouTube:', song.youtubeLink || '');
    if (newYouTube === null) return;

    const newPDF = prompt('Link del PDF:', song.pdfLink || '');
    if (newPDF === null) return;

    song.name = newName.trim() || song.name;
    song.youtubeLink = newYouTube.trim();
    song.pdfLink = newPDF.trim();

    await saveSongs();
    renderSongs();
    updateSongSelector();
}

function setSundayDate() {
    const dateInput = document.getElementById('sundayDate');
    if (!dateInput.value) {
        alert('Por favor selecciona una fecha');
        return;
    }

    currentSundayDate = dateInput.value;
    document.getElementById('currentSundayDisplay').textContent =
        `📅 Domingo seleccionado: ${formatDate(currentSundayDate)}`;

    checkRepetitions();
}

function addToSunday() {
    const selector = document.getElementById('songSelector');
    const songIdStr = selector.value;

    if (!songIdStr) {
        alert('Por favor selecciona una alabanza');
        return;
    }

    const songId = parseInt(songIdStr);

    if (!currentSundayDate) {
        alert('Por favor primero establece la fecha del domingo');
        return;
    }

    if (currentSundaySongs.includes(songId)) {
        alert('Esta alabanza ya está en la lista');
        return;
    }

    if (currentSundaySongs.length >= 5) {
        alert('Ya tienes 5 alabanzas seleccionadas. Puedes eliminar alguna si quieres cambiar.');
        return;
    }

    currentSundaySongs.push(songId);
    renderSundayList();
    checkRepetitions();
    selector.value = '';
}

function removeFromSunday(songId) {
    currentSundaySongs = currentSundaySongs.filter(id => id !== songId);
    renderSundayList();
    checkRepetitions();
}

async function saveSunday() {
    if (!isLider()) { alert('⛔ Solo el Líder puede guardar el setlist del domingo.'); return; }
    if (!currentSundayDate) {
        alert('Por favor establece la fecha del domingo');
        return;
    }

    if (currentSundaySongs.length === 0) {
        alert('Por favor selecciona al menos una alabanza');
        return;
    }

    try {
        const sunday = {
            id: Date.now(),
            date: currentSundayDate,
            songs: [...currentSundaySongs]
        };

        sundays.push(sunday);
        sundays.sort((a, b) => new Date(b.date) - new Date(a.date));

        await saveSundays();

        alert('✅ ¡Domingo guardado exitosamente y sincronizado!');

        currentSundaySongs = [];
        currentSundayDate = null;
        document.getElementById('sundayDate').value = '';
        document.getElementById('currentSundayDisplay').textContent = '';
        document.getElementById('repetitionWarning').innerHTML = '';
        renderSundayList();
        updateStats();
        renderHistory();
    } catch (error) {
        alert('❌ Error al guardar. Por favor intenta de nuevo.');
        console.error('Error guardando domingo:', error);
    }
}

async function deleteSunday(id) {
    if (!isLider()) return;
    if (!confirm('¿Eliminar este domingo del historial?')) return;
    sundays = sundays.filter(s => s.id !== id);
    await saveSundays();
    renderHistory();
    updateStats();
}

function editSundayPrompt(id) {
    if (!isLider()) return;
    const sunday = sundays.find(s => s.id === id);
    if (!sunday) return;
    // Cargar el domingo en el planificador para editarlo
    currentSundayDate = sunday.date;
    currentSundaySongs = [...sunday.songs];
    document.getElementById('sundayDate').value = sunday.date;
    document.getElementById('currentSundayDisplay').textContent =
        `📅 Editando: ${formatDate(sunday.date)}`;
    // Eliminar el registro viejo (se reemplaza al guardar)
    sundays = sundays.filter(s => s.id !== id);
    renderSundayList();
    checkRepetitions();
    // Ir a la pestaña Domingo
    showTab('domingo');
    document.getElementById('tabDomingo').classList.add('active'); // Hack visual
    alert('✏️ Domingo cargado para editar. Modifica las alabanzas y guarda de nuevo.');
}

async function addPendingSong() {
    const name = document.getElementById('pendingSongName').value.trim();
    const suggestedBy = document.getElementById('suggestedBy').value.trim();
    const priority = document.getElementById('pendingPriority').value;
    const notes = document.getElementById('pendingNotes').value.trim();

    if (!name) {
        alert('Por favor escribe el nombre de la alabanza');
        return;
    }

    const pendingSong = {
        id: Date.now(),
        name: name,
        suggestedBy: suggestedBy || 'Anónimo',
        priority: priority || 'Media',
        notes: notes,
        dateAdded: new Date().toISOString()
    };

    pendingSongs.push(pendingSong);
    await savePendingSongsData();

    document.getElementById('pendingSongName').value = '';
    document.getElementById('suggestedBy').value = '';
    document.getElementById('pendingPriority').value = '';
    document.getElementById('pendingNotes').value = '';

    renderPendingSongs();
    alert('✅ ¡Sugerencia agregada y sincronizada! Los demás músicos podrán verla.');
}

async function markAsLearned(id) {
    const pendingSong = pendingSongs.find(s => s.id === id);
    if (!pendingSong) return;

    if (confirm(`¿Marcar "${pendingSong.name}" como aprendida y mover al repertorio?`)) {
        const newSong = {
            id: Date.now(),
            name: pendingSong.name,
            difficulty: 'No especificada',
            youtubeLink: '',
            pdfLink: '',
            addedDate: new Date().toISOString()
        };
        songs.push(newSong);

        learnedSongs.push({
            ...pendingSong,
            learnedDate: new Date().toISOString()
        });

        pendingSongs = pendingSongs.filter(s => s.id !== id);

        await saveSongs();
        await savePendingSongsData();
        await saveLearnedSongsData();

        updateStats();
        renderSongs();
        updateSongSelector();
        renderPendingSongs();
        renderLearnedSongs();

        alert('✅ ¡Alabanza movida al repertorio principal y sincronizada!');
    }
}

async function deletePending(id) {
    if (confirm('¿Eliminar esta sugerencia?')) {
        pendingSongs = pendingSongs.filter(s => s.id !== id);
        await savePendingSongsData();
        renderPendingSongs();
    }
}

function setRehearsalDate() {
    const dateInput = document.getElementById('rehearsalDate');
    const timeInput = document.getElementById('rehearsalTime');

    if (!dateInput.value) {
        alert('Por favor selecciona una fecha');
        return;
    }

    currentRehearsalDate = dateInput.value;
    currentRehearsalTime = timeInput.value;

    document.getElementById('currentRehearsalDisplay').textContent =
        `📅 Ensayo: ${formatDate(currentRehearsalDate)} a las ${currentRehearsalTime}`;
}

function addToRehearsal() {
    const selector = document.getElementById('rehearsalSongSelector');
    const songIdStr = selector.value;

    if (!songIdStr) {
        alert('Por favor selecciona una alabanza');
        return;
    }

    const songId = parseInt(songIdStr);

    if (!currentRehearsalDate) {
        alert('Por favor primero establece la fecha del ensayo');
        return;
    }

    if (currentRehearsalSongs.includes(songId)) {
        alert('Esta alabanza ya está en la lista');
        return;
    }

    currentRehearsalSongs.push(songId);
    renderRehearsalList();
    selector.value = '';
}

function removeFromRehearsal(songId) {
    currentRehearsalSongs = currentRehearsalSongs.filter(id => id !== songId);
    renderRehearsalList();
}

async function saveRehearsal() {
    if (!isLider()) { alert('⛔ Solo el Líder puede guardar ensayos.'); return; }
    if (!currentRehearsalDate) {
        alert('Por favor establece la fecha del ensayo');
        return;
    }

    if (currentRehearsalSongs.length === 0) {
        alert('Por favor selecciona al menos una alabanza');
        return;
    }

    try {
        const notes = document.getElementById('rehearsalNotes').value.trim();

        const rehearsal = {
            id: Date.now(),
            date: currentRehearsalDate,
            time: currentRehearsalTime || '19:00',
            songs: [...currentRehearsalSongs],
            notes: notes
        };

        rehearsals.push(rehearsal);
        rehearsals.sort((a, b) => new Date(b.date) - new Date(a.date));

        await saveRehearsals();

        alert('✅ ¡Ensayo guardado exitosamente y sincronizado!');

        currentRehearsalSongs = [];
        currentRehearsalDate = null;
        currentRehearsalTime = null;
        document.getElementById('rehearsalDate').value = '';
        document.getElementById('rehearsalTime').value = '19:00';
        document.getElementById('currentRehearsalDisplay').textContent = '';
        document.getElementById('rehearsalNotes').value = '';
        renderRehearsalList();
        renderRehearsalHistory();
    } catch (error) {
        console.error('Error completo:', error);
        alert('❌ Error al guardar ensayo. Verifica que la hoja "Rehearsals" exista con los encabezados correctos.');
    }
}

async function deleteRehearsal(id) {
    if (!isLider()) return;
    if (!confirm('¿Eliminar este ensayo?')) return;
    rehearsals = rehearsals.filter(r => r.id !== id);
    await saveRehearsals();
    renderRehearsalHistory();
}

function editRehearsalPrompt(id) {
    if (!isLider()) return;
    const rehearsal = rehearsals.find(r => r.id === id);
    if (!rehearsal) return;
    // Cargar datos del ensayo en el formulario
    currentRehearsalDate = rehearsal.date;
    currentRehearsalTime = rehearsal.time;
    currentRehearsalSongs = [...rehearsal.songs];
    document.getElementById('rehearsalDate').value = rehearsal.date;
    document.getElementById('rehearsalTime').value = rehearsal.time;
    document.getElementById('rehearsalNotes').value = rehearsal.notes || '';
    document.getElementById('currentRehearsalDisplay').textContent =
        `📅 Editando: ${formatDate(rehearsal.date)} a las ${rehearsal.time}`;
    // Eliminar el registro viejo (se reemplaza al guardar)
    rehearsals = rehearsals.filter(r => r.id !== id);
    renderRehearsalList();
    alert('✏️ Ensayo cargado para editar. Modifica y guarda de nuevo.');
}

async function saveConfig() {
    const churchName = document.getElementById('configChurchName').value.trim() || appConfig.churchName;
    const liderIcon = document.getElementById('configLiderIcon').value.trim() || appConfig.liderIcon;
    const liderName = document.getElementById('configLiderName').value.trim() || appConfig.liderName;
    const musicoIcon = document.getElementById('configMusicoIcon').value.trim() || appConfig.musicoIcon;
    const musicoName = document.getElementById('configMusicoName').value.trim() || appConfig.musicoName;
    const invitadoIcon = document.getElementById('configInvitadoIcon').value.trim() || appConfig.invitadoIcon;
    const invitadoName = document.getElementById('configInvitadoName').value.trim() || appConfig.invitadoName;

    appConfig = { ...appConfig, churchName, liderIcon, liderName, musicoIcon, musicoName, invitadoIcon, invitadoName };

    // Guardar en Users!F1:L1 (config de texto)
    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Users!F1:L1',
            valueInputOption: 'RAW',
            resource: { values: [[churchName, liderIcon, liderName, musicoIcon, musicoName, invitadoIcon, invitadoName]] }
        });
    } catch (e) { console.error('Error guardando config:', e); }

    // Guardar logo en Users!M1 (base64)
    if (appConfig.logoBase64) {
        try {
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Users!M1',
                valueInputOption: 'RAW',
                resource: { values: [[appConfig.logoBase64]] }
            });
        } catch (e) { console.error('Error guardando logo:', e); }
    }

    applyConfigToUI();
    alert('✅ ¡Configuración guardada!');
}

async function changeUserRole(email, newRole) {
    if (!isLider()) return;
    // Solo puede haber un líder
    if (newRole === 'lider' && users.some(u => u.role === 'lider' && u.email !== email)) {
        alert(`⚠️ Ya existe un ${appConfig.liderName}. Solo puede haber uno.`);
        renderUsersList();
        return;
    }
    users = users.map(u => u.email === email ? { ...u, role: newRole } : u);
    await saveUsers();
    renderUsersList();
}

async function removeUser(email) {
    if (!isLider()) return;
    if (email === currentUser.email) { alert('No puedes eliminarte a ti mismo.'); return; }
    if (!confirm('¿Eliminar este miembro del equipo?')) return;
    users = users.filter(u => u.email !== email);
    await saveUsers();
    renderUsersList();
}

async function confirmRole() {
    const name = document.getElementById('newUserName').value.trim();
    if (!name || !selectedRole) return;

    const newUser = {
        email: currentUser.email,
        name: name,
        role: selectedRole,
        joinedDate: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers();

    currentUser.role = selectedRole;
    currentUser.name = name;

    document.getElementById('roleSelectionOverlay').classList.remove('active');
    updateUserUI();
    applyRolePermissions();

    alert(`✅ ¡Bienvenido al equipo, ${name}! Estás registrado como ${selectedRole === 'lider' ? '👑 Líder' : '🎸 Músico'}.`);
}

// Inicializar
window.onload = () => {
    // Configuración de fecha por defecto
    const sundayPicker = document.getElementById('sundayDate');
    if (sundayPicker) {
        const today = new Date().toISOString().split('T')[0];
        sundayPicker.value = today;
    }

    // Listeners
    const userNameInput = document.getElementById('newUserName');
    if (userNameInput) {
        userNameInput.addEventListener('input', (e) => {
            const btn = document.getElementById('confirmRoleBtn');
            if (btn) btn.disabled = !e.target.value.trim() || !selectedRole;
        });
    }
};
