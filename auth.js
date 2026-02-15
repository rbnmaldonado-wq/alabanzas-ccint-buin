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

    // Intentar restaurar sesión
    const storedToken = localStorage.getItem('gapi_token');
    if (storedToken) {
        const token = JSON.parse(storedToken);
        // Verificar expiración (rudimentario, mejor dejar que gapi maneje errores 401 si expiró)
        gapi.client.setToken(token);
        accessToken = token;

        // Restaurar estado de usuario
        userEmail = localStorage.getItem('user_email') || '';
        userFullName = localStorage.getItem('user_name') || '';

        if (userEmail) {
            currentUser.email = userEmail;
            currentUser.name = userFullName;
            console.log('Sesión restaurada para:', userEmail);

            // Ocultar login y cargar app directamente
            document.getElementById('loadingOverlay').classList.remove('active');

            // Iniciar carga de datos
            if (window.loadAllData) {
                const hasConfig = await checkChurchConfig();
                if (hasConfig) await window.loadAllData();
            }
            await checkUserRole();
            document.getElementById('mainContent').style.display = 'block';
            return; // Salir, no mostrar botones de login
        }
    }

    maybeEnableButtons();
}

// Función que maneja la respuesta del botón HTML de Google (Data API)
window.handleCredentialResponse = function (credentialResponse) {
    try {
        const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
        userEmail = payload.email || '';
        userFullName = payload.name || payload.email || '';

        // Guardar info básica
        localStorage.setItem('user_email', userEmail);
        localStorage.setItem('user_name', userFullName);

        console.log("Usuario autenticado via GIS Button/OneTap:", userEmail);

        // Si tenemos token de Drive (restaurado), procedemos. 
        if (!accessToken) {
            // NO llamar a handleAuthClick() automáticamente para evitar bloqueos de popup.
            // En su lugar, actualizar la UI para pedir el click manual.
            const loadingText = document.getElementById('loadingText');
            if (loadingText) loadingText.textContent = `Hola, ${userFullName}`;

            const loadingSubtext = document.getElementById('loadingSubtext');
            if (loadingSubtext) loadingSubtext.textContent = 'Para continuar, necesitamos confirmar permisos de Google Drive.';

            // Ocultar botón de Google (ya se logueó)
            const googleBtn = document.getElementById('googleBtnContainer');
            if (googleBtn) googleBtn.style.display = 'none';

            // Mostrar botón de autorización manual
            const manualContainer = document.getElementById('manualLoginContainer');
            if (manualContainer) manualContainer.style.display = 'block';

            // Actualizar texto del botón manual
            const manualBtn = manualContainer.querySelector('button');
            if (manualBtn) manualBtn.textContent = 'Autorizar Acceso a Datos 🔐';
        }
    } catch (e) {
        console.error("Error decodificando credencial GIS:", e);
    }
};

function gisLoaded() {
    // Inicializar Google Identity para capturar email
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: window.handleCredentialResponse, // Usar la función global
        auto_select: true,
    });

    // Renderizar botón explícitamente en el contenedor
    const btnParent = document.getElementById('googleBtnContainer');
    if (btnParent) {
        google.accounts.id.renderButton(
            btnParent,
            { theme: "filled_black", size: "large", shape: "rectangular", width: "250", text: "signin_with" }
        );
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => { console.log("Token callback default", resp); }, // Placeholder válido
        prompt: 'select_account',
    });
    gisInited = true;

    // Solo llamar si no restauramos sesión en gapiLoaded
    if (!accessToken) maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited && !accessToken) {
        document.getElementById('loadingOverlay').classList.add('active');

        // Timeout de seguridad: Si en 4 segundos no hemos entrado, mostramos botón manual
        setTimeout(() => {
            if (!accessToken) {
                // Si el spinner sigue ahí, es que algo falló o se bloqueó
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) spinner.style.display = 'none';

                const loadingText = document.getElementById('loadingText');
                if (loadingText) loadingText.textContent = 'Acceso Requerido';

                const subtext = document.getElementById('loadingSubtext');
                if (subtext) subtext.style.display = 'none';

                const manualContainer = document.getElementById('manualLoginContainer');
                if (manualContainer) manualContainer.style.display = 'block';
            }
        }, 4000);

        // Primero intentar obtener email con google.accounts.id
        try {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    console.log('OneTap skipped:', notification.getNotDisplayedReason());
                }
                // Pequeño delay e intentar flujo automático
                setTimeout(() => handleAuthClick(), 1000);
            });
        } catch (e) {
            console.error(e);
            handleAuthClick();
        }
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        accessToken = gapi.client.getToken();

        // GUARDAR TOKEN
        localStorage.setItem('gapi_token', JSON.stringify(accessToken));

        // Si ya tenemos email del ID callback, usarlo
        // Si no, usar el hint del token
        if (!userEmail && accessToken.login_hint) {
            userEmail = accessToken.login_hint;
        }
        if (!userFullName && userEmail) {
            userFullName = userEmail.split('@')[0];
        }

        // Guardar datos de usuario
        localStorage.setItem('user_email', userEmail);
        localStorage.setItem('user_name', userFullName);

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
