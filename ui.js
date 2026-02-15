// Funciones de UI
console.log('%c UI.JS v12 LOADED - ALL NULL CRASHES FIXED ', 'background: #22c55e; color: #ffffff; font-weight: bold; padding: 4px;');

// Inicializar Navegación Lateral
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            const pageTitle = item.getAttribute('data-title');
            switchTab(tabName, pageTitle);
        });
    });

    // Restaurar pestaña activa si existe
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('data-tab');
        const pageTitle = activeTab.getAttribute('data-title');
        // Asegurar que el contenido también esté activo
        switchTab(tabName, pageTitle);
    }
});

function switchTab(tabName, pageTitle) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none'; // Asegurar ocultamiento
    });

    // 2. Desactivar todos los items del sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 3. Mostrar sección seleccionada
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }

    // 4. Activar item del sidebar correspondiente
    const activeItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // 5. Actualizar Título de la Página
    const titleElement = document.getElementById('pageTitle');
    if (titleElement && pageTitle) {
        titleElement.textContent = pageTitle;
    }

    // Lógica específica por pestaña
    if (tabName === 'configuracion') loadConfigForm();
}

// CORREGIDA: Función renderSongs limpia y robusta
function renderSongs() {
    // Intentar obtener el contenedor (a veces se llama songList o songsList, cubrimos ambos por si acaso)
    let container = document.getElementById('songList') || document.getElementById('songsList');

    if (!container) return;

    if (typeof songs === 'undefined' || songs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎵</div>
                <p>No hay alabanzas en el repertorio todavía</p>
                <p style="font-size: 0.9em; margin-top: 10px;">Agrega tu primera alabanza arriba</p>
            </div>
        `;
        return;
    }

    container.innerHTML = songs.map(song => {
        let difficultyBadge = '';
        if (song.difficulty === 'Baja') difficultyBadge = '<span class="badge badge-low">Baja</span>';
        else if (song.difficulty === 'Media') difficultyBadge = '<span class="badge badge-medium">Media</span>';
        else difficultyBadge = '<span class="badge badge-high">Alta</span>';

        // Botones de admin sin espacios extra en las etiquetas
        const adminButtons = isLider() ? `
            <button class="icon-btn edit-btn" onclick="editSong(${song.id})" title="Editar"><span class="material-icons-round">edit</span></button>
            <button class="icon-btn delete-btn" onclick="deleteSong(${song.id})" title="Eliminar"><span class="material-icons-round">delete</span></button>
        ` : '';

        return `
            <div class="glass-card song-card" style="margin-bottom: 20px; padding: 20px; border-radius: 12px; position: relative; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="background: rgba(20, 184, 166, 0.1); padding: 8px; border-radius: 8px;">
                        <span class="material-icons-round" style="color: var(--primary);">audiotrack</span>
                    </div>
                    ${difficultyBadge}
                </div>
                
                <h4 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 5px; color: white;">${song.name}</h4>
                
                <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 15px;">
                    ${song.artist ? song.artist : 'Artista Desconocido'}
                </div>
                
                <div class="flex items-center justify-between" style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div class="flex gap-2" style="display: flex; gap: 10px;">
                        ${song.key ? `<div class="key-badge" style="background: rgba(20, 184, 166, 0.1); padding: 4px 8px; border-radius: 6px; color: var(--primary); font-size: 0.8rem; font-weight: bold; border: 1px solid rgba(20, 184, 166, 0.2);">${song.key}</div>` : ''}
                        ${song.bpm ? `<div class="bpm-badge" style="background: rgba(255, 255, 255, 0.05); padding: 4px 8px; border-radius: 6px; color: #cbd5e1; font-size: 0.8rem; font-weight: bold; border: 1px solid rgba(255, 255, 255, 0.1);">${song.bpm} BPM</div>` : ''}
                    </div>
                    
                    <div class="song-actions" style="display: flex; gap: 5px;">
                        ${song.youtubeLink ? `<button class="icon-btn" onclick="window.open('${song.youtubeLink}', '_blank')" title="Ver en YouTube" style="color: #ef4444;"><span class="material-icons-round">play_circle</span></button>` : ''}
                        ${song.pdfLink ? `<button class="icon-btn" onclick="window.open('${song.pdfLink}', '_blank')" title="Ver PDF" style="color: #2dd4bf;"><span class="material-icons-round">description</span></button>` : ''}
                        ${adminButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const totalSongsEl = document.getElementById('totalSongs');
    const totalSundaysEl = document.getElementById('totalSundays');

    if (totalSongsEl) totalSongsEl.textContent = songs.length;
    if (totalSundaysEl) totalSundaysEl.textContent = sundays.length;
}

function updateSongSelector() {
    const selector = document.getElementById('sundaySongSelector');
    if (selector) {
        selector.innerHTML = '<option value="">Selecciona una alabanza...</option>' +
            songs.map(song => `<option value="${song.id}">${song.name}</option>`).join('');
    }
    updateRehearsalSelector();
}

function renderSundayList() {
    const container = document.getElementById('sundayList');

    if (currentSundaySongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎤</div>
                <p>No hay alabanzas seleccionadas para este domingo</p>
            </div>
            `;
        return;
    }

    container.innerHTML = currentSundaySongs.map((songId, index) => {
        const song = songs.find(s => s.id === songId);
        return `
            <div class="selected-song">
                <div class="song-info">
                    <div class="song-name">${index + 1}. ${song.name}</div>
                    <div class="song-meta" style="color: #99f6e4;">${song.difficulty}</div>
                </div>
                <button class="btn-small btn-danger" onclick="removeFromSunday(${songId})">❌</button>
            </div>
            `;
    }).join('');
}

function checkRepetitions() {
    if (!currentSundayDate || currentSundaySongs.length === 0) {
        document.getElementById('repetitionWarning').innerHTML = '';
        return;
    }

    const currentDate = new Date(currentSundayDate);
    const fourWeeksAgo = new Date(currentDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentSundays = sundays.filter(s => {
        const sundayDate = new Date(s.date);
        // Arreglar comparacion de fechas
        const sDate = new Date(s.date + 'T12:00:00');
        const cDate = new Date(currentSundayDate + 'T12:00:00');
        const fAgo = new Date(cDate);
        fAgo.setDate(fAgo.getDate() - 28);
        return sDate > fAgo && sDate < cDate;
    });

    const recentSongIds = new Set();
    recentSundays.forEach(sunday => {
        sunday.songs.forEach(songId => recentSongIds.add(songId));
    });

    const repeatedSongs = currentSundaySongs.filter(songId => recentSongIds.has(songId));

    if (repeatedSongs.length > 0) {
        const repeatedNames = repeatedSongs.map(id => {
            const song = songs.find(s => s.id === id);
            return song.name;
        }).join(', ');

        document.getElementById('repetitionWarning').innerHTML = `
            <div class="warning">
                ⚠️ <strong>Atención:</strong> Las siguientes alabanzas se tocaron en las últimas 4 semanas: <strong>${repeatedNames}</strong>
            </div>
            `;
    } else {
        document.getElementById('repetitionWarning').innerHTML = `
            <div class="card" style="background: #064e3b; border-color: #059669;">
                ✅ <strong>Perfecto:</strong> Ninguna de estas alabanzas se ha tocado en las últimas 4 semanas
            </div>
            `;
    }
}

function renderHistory() {
    const container = document.getElementById('historyList');

    if (sundays.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <p>No hay domingos registrados todavía</p>
            </div>
            `;
        return;
    }

    const last8 = sundays.slice(0, 8);

    container.innerHTML = last8.map(sunday => {
        const songNames = sunday.songs.map(songId => {
            const song = songs.find(s => s.id === songId);
            return song ? song.name : 'Alabanza eliminada';
        });

        const adminButtons = isLider() ? `
            <div class="history-actions">
                <button class="btn-small" style="background:#0f766e;" onclick="editSundayPrompt(${sunday.id})" title="Editar">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteSunday(${sunday.id})" title="Eliminar">🗑️</button>
            </div>
            ` : '';

        return `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-date">${formatDate(sunday.date)}</div>
                    ${adminButtons}
                </div>
                <div class="history-songs">
                    ${songNames.map(name => `<span class="history-song-tag">${name}</span>`).join('')}
                </div>
            </div>
            `;
    }).join('');
}

function renderPendingSongs() {
    // Corregido: El ID en HTML es 'pendingList'
    const container = document.getElementById('pendingList') || document.getElementById('pendingSongsList');

    if (!container) return;

    if (pendingSongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <p>No hay alabanzas pendientes por aprender</p>
                <p style="font-size: 0.9em; margin-top: 10px;">Sugiere una nueva alabanza arriba</p>
            </div>
            `;
        return;
    }

    const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
    const sorted = [...pendingSongs].sort((a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    container.innerHTML = sorted.map(song => {
        const priorityColors = {
            'Alta': 'background: #7c2d12; border-left: 4px solid #f97316;',
            'Media': 'background: #1e3a8a; border-left: 4px solid #3b82f6;',
            'Baja': 'background: #14532d; border-left: 4px solid #22c55e;'
        };

        return `
            <div class="song-item" style="${priorityColors[song.priority]}">
                <div class="song-info">
                    <div class="song-name">${song.name}</div>
                    <div class="song-meta">
                        Sugerida por: ${song.suggestedBy} | 
                        Prioridad: ${song.priority}
                        ${song.notes ? `<br>📝 ${song.notes}` : ''}
                    </div>
                </div>
                <div class="song-actions">
                    <button class="btn-small btn-success" onclick="markAsLearned(${song.id})">
                        ✅ Aprendida
                    </button>
                    <button class="btn-small btn-danger" onclick="deletePending(${song.id})">
                        🗑️
                    </button>
                </div>
            </div>
            `;
    }).join('');
}

function renderLearnedSongs() {
    const container = document.getElementById('learnedSongsList');

    if (!container) return;

    if (learnedSongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <p>Aún no hay alabanzas aprendidas desde las sugerencias</p>
            </div>
            `;
        return;
    }

    container.innerHTML = learnedSongs.slice(-10).reverse().map(song => `
            <div class="song-item" style="background: #064e3b; border-left: 4px solid #22c55e;">
                <div class="song-info">
                    <div class="song-name">✅ ${song.name}</div>
                    <div class="song-meta">
                        Sugerida por: ${song.suggestedBy} |
                        Aprendida: ${new Date(song.learnedDate).toLocaleDateString('es-ES')}
                    </div>
                </div>
        </div>
            `).join('');
}

function renderRehearsalList() {
    const container = document.getElementById('rehearsalList');

    if (currentRehearsalSongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎸</div>
                <p>No hay alabanzas seleccionadas para este ensayo</p>
            </div>
            `;
        return;
    }

    container.innerHTML = currentRehearsalSongs.map((songId, index) => {
        const song = songs.find(s => s.id === songId);
        return `
            <div class="selected-song">
                <div class="song-info">
                    <div class="song-name">${index + 1}. ${song.name}</div>
                    <div class="song-meta" style="color: #99f6e4;">${song.difficulty}</div>
                </div>
                <button class="btn-small btn-danger" onclick="removeFromRehearsal(${songId})">❌</button>
            </div>
            `;
    }).join('');
}

function updateRehearsalSelector() {
    const selector = document.getElementById('rehearsalSongSelector');
    if (selector) {
        selector.innerHTML = '<option value="">Selecciona una alabanza...</option>' +
            songs.map(song => `<option value="${song.id}">${song.name}</option>`).join('');
    }
}

function renderRehearsalHistory() {
    const container = document.getElementById('rehearsalHistoryList');

    // Protección contra null (Fix v10)
    if (!container) return;

    if (rehearsals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No hay ensayos registrados todavía</p>
            </div>
            `;
        return;
    }

    const now = new Date();
    // Comparar fecha+hora
    const upcoming = rehearsals.filter(r => {
        const rDate = new Date(r.date + 'T' + (r.time || '00:00'));
        return rDate >= now;
    });
    const past = rehearsals.filter(r => {
        const rDate = new Date(r.date + 'T' + (r.time || '00:00'));
        return rDate < now;
    });

    let html = '';

    const renderRehearsalItem = (rehearsal, color = '#3b82f6') => {
        const songNames = rehearsal.songs.map(songId => {
            const song = songs.find(s => s.id === songId);
            return song ? song.name : 'Alabanza eliminada';
        });
        const adminButtons = isLider() ? `
            <div class="history-actions">
                <button class="btn-small" style="background:#0f766e;" onclick="editRehearsalPrompt(${rehearsal.id})" title="Editar">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteRehearsal(${rehearsal.id})" title="Eliminar">🗑️</button>
            </div>
            ` : '';
        return `
            <div class="history-item" style="border-left-color: ${color};">
                <div class="history-item-header">
                    <div class="history-date">📅 ${formatDate(rehearsal.date)} — ⏰ ${rehearsal.time}</div>
                    ${adminButtons}
                </div>
                ${rehearsal.notes ? `<p style="color: #94a3b8; font-size:0.9em;">📝 ${rehearsal.notes}</p>` : ''}
        <div class="history-songs">
            ${songNames.map(name => `<span class="history-song-tag">${name}</span>`).join('')}
        </div>
            </div>
            `;
    };

    if (upcoming.length > 0) {
        html += '<h3 style="color: #22c55e; margin-bottom: 15px;">🔜 Próximos Ensayos</h3>';
        html += upcoming.map(r => renderRehearsalItem(r, '#22c55e')).join('');
    }

    if (past.length > 0) {
        html += '<h3 style="color: #2dd4bf; margin: 20px 0 15px 0;">📜 Ensayos Anteriores</h3>';
        html += past.slice(0, 5).map(r => renderRehearsalItem(r, '#0f766e')).join('');
    }

    container.innerHTML = html;
}

// Config UI
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamaño (máx 200KB)
    if (file.size > 200 * 1024) {
        alert('⚠️ La imagen es muy pesada. Máximo 200KB. Intenta comprimir la imagen antes de subirla.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        appConfig.logoBase64 = e.target.result;
        updateLogoPreview(e.target.result);
        updateHeaderLogo(e.target.result);
        // Guardar automáticamente el logo en localStorage como respaldo rápido
        try { localStorage.setItem('churchLogo', e.target.result); } catch (err) { }
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    appConfig.logoBase64 = '';
    updateLogoPreview('');
    updateHeaderLogo('');
    try { localStorage.removeItem('churchLogo'); } catch (err) { }
}

function updateLogoPreview(src) {
    const img = document.getElementById('logoPreviewImg');
    const placeholder = document.getElementById('logoPreviewPlaceholder');
    if (src) {
        img.src = src;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function updateHeaderLogo(src) {
    const wrapper = document.getElementById('churchLogoWrapper');
    const logoImg = document.getElementById('churchLogo');
    if (src) {
        logoImg.src = src;
        wrapper.style.display = 'block';
    } else {
        wrapper.style.display = 'none';
    }
}

function applyConfigToUI() {
    // Subtítulo con nombre de iglesia
    const subtitleEl = document.querySelector('.subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `Sistema musical de ${appConfig.churchName} - SINCRONIZADO`;
    }

    // Logo en header
    updateHeaderLogo(appConfig.logoBase64 || '');

    // Badge del usuario
    updateUserUI();

    // Opciones en pantalla de selección de rol (con protección)
    const liderOpt = document.querySelector('#roleOptLider .role-option-title');
    if (liderOpt) liderOpt.textContent = `${appConfig.liderIcon} ${appConfig.liderName} `;

    const musicoOpt = document.querySelector('#roleOptMusico .role-option-title');
    if (musicoOpt) musicoOpt.textContent = `${appConfig.musicoIcon} ${appConfig.musicoName} `;

    const invitadoOpt = document.querySelector('#roleOptInvitado .role-option-title');
    if (invitadoOpt) invitadoOpt.textContent = `${appConfig.invitadoIcon} ${appConfig.invitadoName} `;

    // Previsualizaciones en config
    document.getElementById('previewLiderIcon').textContent = appConfig.liderIcon;
    document.getElementById('previewLiderName').textContent = appConfig.liderName;
    document.getElementById('previewMusicoIcon').textContent = appConfig.musicoIcon;
    document.getElementById('previewMusicoName').textContent = appConfig.musicoName;
    document.getElementById('previewInvitadoIcon').textContent = appConfig.invitadoIcon;
    document.getElementById('previewInvitadoName').textContent = appConfig.invitadoName;
}

function loadConfigForm() {
    document.getElementById('configChurchName').value = appConfig.churchName;
    document.getElementById('configLiderIcon').value = appConfig.liderIcon;
    document.getElementById('configLiderName').value = appConfig.liderName;
    document.getElementById('configMusicoIcon').value = appConfig.musicoIcon;
    document.getElementById('configMusicoName').value = appConfig.musicoName;
    document.getElementById('configInvitadoIcon').value = appConfig.invitadoIcon;
    document.getElementById('configInvitadoName').value = appConfig.invitadoName;
    updateLogoPreview(appConfig.logoBase64 || '');
    applyConfigToUI();
    renderUsersList();
}

function renderUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;
    if (users.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;">No hay miembros registrados aún.</p>';
        return;
    }
    const roleLabel = (role) => {
        if (role === 'lider') return `${appConfig.liderIcon} ${appConfig.liderName} `;
        if (role === 'musico') return `${appConfig.musicoIcon} ${appConfig.musicoName} `;
        return `${appConfig.invitadoIcon} ${appConfig.invitadoName} `;
    };

    container.innerHTML = users.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center;
        background:#0f172a; border-radius: 10px; padding: 14px 18px; margin-bottom: 10px;">
            <div>
                <div style="font-weight:700; color:#dbeafe;">${u.name}</div>
                <div style="font-size:0.85em; color:#64748b;">${u.email}</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <select onchange="changeUserRole('${u.email}', this.value)"
                    style="background:#1e293b; border:1px solid #334155; border-radius:6px;
                               color:#e2e8f0; padding:5px 8px; font-size:0.9em;">
                    <option value="lider" ${u.role === 'lider' ? 'selected' : ''}>👑 ${appConfig.liderName}</option>
                    <option value="musico" ${u.role === 'musico' ? 'selected' : ''}>🎸 ${appConfig.musicoName}</option>
                    <option value="invitado" ${u.role === 'invitado' ? 'selected' : ''}>🌱 ${appConfig.invitadoName}</option>
                </select>
                <button class="btn-small btn-danger" onclick="removeUser('${u.email}')">🗑️</button>
            </div>
        </div>
            `).join('');
}

function updateUserUI() {
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userDisplayName').textContent = currentUser.name;

    const badge = document.getElementById('userRoleBadge');
    if (currentUser.role === 'lider') {
        badge.innerHTML = `<span class="role-badge role-lider">${appConfig.liderIcon} ${appConfig.liderName}</span>`;
    } else if (currentUser.role === 'musico') {
        badge.innerHTML = `<span class="role-badge role-musico">${appConfig.musicoIcon} ${appConfig.musicoName}</span>`;
    } else {
        badge.innerHTML = `<span class="role-badge role-invitado">${appConfig.invitadoIcon} ${appConfig.invitadoName}</span>`;
    }
}

function applyRolePermissions() {
    const invMsg = document.getElementById('invitadoPendientesMsg');

    if (isLider()) {
        document.querySelectorAll('.lider-only').forEach(el => el.style.display = '');
        document.querySelectorAll('.musico-only').forEach(el => el.style.display = '');
        document.querySelectorAll('.musico-readonly').forEach(el => el.classList.remove('readonly-overlay'));
        document.getElementById('tabDomingo').style.display = '';
        document.getElementById('tabEnsayosAdmin').style.display = '';
        if (invMsg) invMsg.style.display = 'none';

    } else if (isMusico()) {
        document.querySelectorAll('.lider-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.musico-only').forEach(el => el.style.display = '');
        document.querySelectorAll('.musico-readonly').forEach(el => el.classList.add('readonly-overlay'));
        document.getElementById('tabDomingo').style.display = 'none';
        document.getElementById('tabEnsayosAdmin').style.display = 'none';
        if (invMsg) invMsg.style.display = 'none';

    } else {
        // Invitado: solo lectura estricta
        document.querySelectorAll('.lider-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.musico-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.musico-readonly').forEach(el => el.classList.add('readonly-overlay'));
        document.getElementById('tabDomingo').style.display = 'none';
        document.getElementById('tabEnsayosAdmin').style.display = 'none';
        if (invMsg) invMsg.style.display = 'block';
    }

    renderSongs();
    renderHistory();
    renderRehearsalHistory();
    renderPendingSongs();
}

function showRoleSelection() {
    // Verificar si ya hay un líder
    const existingLider = users.find(u => u.role === 'lider');
    if (existingLider) {
        document.getElementById('roleWarning').style.display = 'block';
        document.getElementById('roleOptLider').style.opacity = '0.4';
        document.getElementById('roleOptLider').style.pointerEvents = 'none';
    }
    document.getElementById('roleSelectionOverlay').classList.add('active');
}

function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('selected'));
    const roleId = role.charAt(0).toUpperCase() + role.slice(1);
    const el = document.getElementById(`roleOpt${roleId}`);
    if (el) el.classList.add('selected');

    const nameVal = document.getElementById('newUserName').value.trim();
    document.getElementById('confirmRoleBtn').disabled = !nameVal;
}

// Lógica de Selección de Iglesia (Multi-Tenant)
async function checkChurchConfig() {
    const sheetId = getSpreadsheetId();
    if (!sheetId) {
        showChurchSelection();
        return false;
    }
    return true; // Tenemos configuración, proceder
}

function showChurchSelection() {
    document.getElementById('churchSelectionOverlay').classList.add('active');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('loadingOverlay').classList.remove('active');
}

async function validateAndSaveChurch(mode = 'MANUAL') {
    let sheetId = '';
    const btnId = mode === 'AUTO' ? 'createChurchBtn' : 'joinChurchBtn';
    const btn = document.getElementById(btnId);

    // Fallback por si el botón no existe en el DOM
    if (!btn) {
        console.error('Botón no encontrado para modo:', mode);
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Procesando...';
    btn.disabled = true;

    try {
        if (mode === 'AUTO') {
            // FORZAR la petición de permisos para asegurar que tenemos drive.readonly y drive.file
            // Incluso si ya parece estar logueado, necesitamos confirmar los nuevos scopes.
            console.log("Solicitando permisos de Drive...");
            await new Promise((resolve, reject) => {
                tokenClient.callback = (resp) => {
                    if (resp.error) reject(resp);
                    resolve(resp);
                };
                tokenClient.requestAccessToken({ prompt: 'consent' });
            });

            // Crear copia automática
            sheetId = await createChurchSheet();
        } else {
            // Modo Manual
            sheetId = document.getElementById('churchIdInput').value.trim();
            if (!sheetId) throw new Error('ID vacío');

            if (sheetId.length < 20) {
                alert('⚠️ Ese ID parece muy corto.');
                throw new Error('ID corto');
            }
        }

        // Validar acceso
        setSpreadsheetId(sheetId);

        // Intentar leer la configuración (una celda liviana)
        await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Users!A1',
        });

        alert('✅ ¡Conexión exitosa! Bienvenido a tu iglesia.');
        document.getElementById('churchSelectionOverlay').classList.remove('active');
        location.reload();

    } catch (error) {
        console.error('Error:', error);
        setSpreadsheetId('');
        if (mode === 'MANUAL' && error.message !== 'ID corto') {
            alert('❌ No se pudo conectar. Verifica el ID o los permisos.');
        } else if (mode === 'AUTO') {
            alert('❌ Falló la creación automática. Por favor intenta el método manual.');
        }
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function switchChurch() {
    if (confirm('¿Estás seguro que quieres cambiar de iglesia? Se borrará la configuración actual y tendrás que ingresar un nuevo ID.')) {
        setSpreadsheetId('');
        location.reload();
    }
}

async function resetUsers() {
    const confirmation = prompt('⚠️ PELIGRO ⚠️\nEsto borrará a TODOS los usuarios (incluido tú) de la lista de miembros.\n\nEsto es útil si el Líder perdió el acceso y necesitan empezar de cero.\n\nEscribe "BORRAR" para confirmar:');

    if (confirmation === 'BORRAR') {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Borrando...';
        btn.disabled = true;

        try {
            // Borrar datos de Users!A2:D51 (dejando la config en F1 intacta)
            const emptyRows = Array(50).fill(['', '', '', '']); // Borrar 50 usuarios
            await writeSheet('Users!A2:D51', emptyRows);

            alert('✅ Usuarios reseteados. La página se recargará para que puedas registrarte como nuevo Líder.');
            location.reload();
        } catch (error) {
            console.error(error);
            alert('❌ Error al resetear.');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}
