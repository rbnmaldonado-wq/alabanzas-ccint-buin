// Variables globales de Auth
let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken = null;
let userEmail = '';
let userFullName = '';

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [
            'https://sheets.googleapis.com/$discovery/rest?version=v4',
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        ],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    // Inicializar Google Identity para capturar email
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (credentialResponse) => {
            // Decodificar el JWT para obtener email y nombre
            try {
                const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
                userEmail = payload.email || '';
                userFullName = payload.name || payload.email || '';
            } catch (e) { }
        },
        auto_select: true,
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Se define dinámicamente en handleAuthClick
        prompt: 'select_account',
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('loadingOverlay').classList.add('active');
        // Primero intentar obtener email con google.accounts.id
        google.accounts.id.prompt((notification) => {
            // Después de intentar el prompt, pedir el token OAuth
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Si no se muestra el prompt one-tap, iniciamos el flujo manual igual
            }
            // Pequeño delay para UX
            setTimeout(() => handleAuthClick(), 500);
        });
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        accessToken = gapi.client.getToken();

        // Si ya tenemos email del ID callback, usarlo
        // Si no, usar el hint del token
        if (!userEmail && accessToken.login_hint) {
            userEmail = accessToken.login_hint;
        }
        if (!userFullName && userEmail) {
            userFullName = userEmail.split('@')[0];
        }

        currentUser.email = userEmail;
        currentUser.name = userFullName;

        updateSyncStatus('synced', 'Sincronizado');

        // Iniciar carga de datos
        if (window.loadAllData) {
            // Verificar primero si tenemos config de iglesia
            const hasConfig = await checkChurchConfig();
            if (!hasConfig) return; // Detener flujo si no hay iglesia seleccionada

            await window.loadAllData();
        } else {
            console.error("loadAllData no está disponible globalmente aún");
        }

        await checkUserRole();

        document.getElementById('loadingOverlay').classList.remove('active');
        document.getElementById('mainContent').style.display = 'block';
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

async function checkUserRole() {
    const existingUser = users.find(u => u.email === currentUser.email);

    if (existingUser) {
        // Usuario conocido - cargar su rol
        currentUser.role = existingUser.role;
        currentUser.name = existingUser.name;
        updateUserUI();
        applyRolePermissions();
    } else {
        // Usuario nuevo - mostrar pantalla de selección
        currentUser.isNew = true;
        showRoleSelection();
    }
}
