# Análisis de Reconstrucción: Worship Manager v2

## 1. Resumen de la Nueva Arquitectura (v2)
Worship Manager v2 es una reconstrucción completa enfocada en la robustez y mantenibilidad, solucionando los problemas de autenticación y "spaghetti code" de la v1.

## 2. Tecnologías y Estructura
- **Frontend**: ES Modules nativos (sin bundlers complejos), HTML5 Semántico, CSS3 Variables.
- **Backend / Datos**: Google Sheets API v4 (Persistencia en la nube).
- **Autenticación**:
    - **Patrón**: Token Model (OAuth2 implícito) + Google Identity Services (GIS).
    - **Seguridad**: Manejo explícito de expiración de tokens. Eliminación de reintentos infinitos.
- **Estado**:
    - **Pattern**: Centralized Store (`state.js`) con patron Pub/Sub simple.
    - **Beneficio**: Desacoplamiento total entre lógica de datos y UI.

## 3. Componentes Principales (`/v2/src/`)

### `auth.js` (Seguridad)
- Administra el ciclo de vida del token de Google.
- Detecta expiración y solicita re-login de forma limpia.
- Expone eventos `auth-changed` para que la app reaccione.

### `api.js` (Datos)
- Capa de abstracción sobre `gapi.client.sheets`.
- Convierte Arrays de Google Sheets en Objetos JS tipados (`Songs`, `Sundays`, `Users`).
- Maneja errores de red y tokens inválidos (401/403).

### `state.js` (Store)
- Fuente única de verdad. Reemplaza variables globales como `window.songs`.
- Permite que múltiples componentes (UI) reaccionen a cambios en los datos.

### `app.js` (Controlador)
- Punto de entrada. Orquesta la inicialización de Auth -> State -> UI.

## 4. Estado de la Migración
- [x] **Estilos**: Variables CSS unificadas y z-index organizados.
- [x] **Core**: Autenticación y API implementadas.
- [ ] **UI**: Pendiente migración de vistas (Repertorio, Domingo, Ensayos).

## 5. Próximos Pasos Recomendados
1.  **Migración de Vistas**: Mover la lógica de renderizado de `ui.v17.js` (legacy) a módulos en `v2/src/ui/`.
2.  **Service Worker**: Implementar soporte offline real (PWA) una vez estabilizada la v2.
