# Análisis de la Aplicación Worship Manager

## 1. Resumen General
La aplicación es una Single Page Application (SPA) autorenida en un único archivo `index.html`. Su propósito es gestionar el repertorio musical, la planificación de servicios dominicales y ensayos para un equipo de alabanza, utilizando Google Sheets como base de datos.

## 2. Arquitectura y Tecnologías
- **Frontend**: HTML5, CSS3 (con Grid y Flexbox), JavaScript (ES6+).
- **Backend / Base de Datos**: Google Sheets API v4.
- **Autenticación**: Google Identity Services (GIS) y OAuth 2.0.
- **Estado**: Variables globales en memoria sincronizadas manualmente.
- **Estilo**: Diseño "Dark Mode" personalizado con gradientes y sombras suaves, responsivo.

## 3. Puntos Fuertes
- **Simplicidad**: Al ser un solo archivo, el despliegue es trivial.
- **Costo Efeiciente**: Uso de herramientas gratuitas (Google Sheets) como backend.
- **UX/UI**: Interfaz moderna y atractiva con feedback visual.
- **Funcionalidad Completa**: Cubre todo el ciclo de vida de la gestión musical.
- **Roles de Usuario**: Implementación de permisos básicos (Líder, Músico, Invitado).

## 4. Áreas de Mejora y Riesgos

### Seguridad (Crítico)
- **API Keys Expuestas**: La `API_KEY` y `CLIENT_ID` están hardcodeadas en el código cliente.
  - *Riesgo*: Cualquiera puede tomar esa API Key.
  - *Mitigación*: Restringir la API Key en Google Cloud Console para que solo acepte peticiones desde el dominio donde esté alojada la app.
- **Validación en Cliente**: La seguridad de roles (`isLider()`) está solo en el frontend.
  - *Mitigación*: Aceptable para un entorno de confianza, pero es importante tenerlo en cuenta.

### Mantenibilidad
- **Código Monolítico**: El archivo tiene +2400 líneas mezclando HTML, CSS y JS.
  - *Problema*: Difícil de mantener y escalar.
  - *Recomendación*: Separar en `styles.css`, `app.js` y `index.html`.
- **Gestión de Estado**: El estado se maneja con variables globales dispersas.
  - *Recomendación*: Agrupar el estado en un objeto único `Store` o usar un patrón MVC simple.

### Rendimiento
- **Carga de Datos**: `loadAllData()` descarga TODAS las hojas de cálculo al inicio.
  - *Problema*: A medida que el historial crezca, la carga inicial será cada vez más lenta.
  - *Recomendación*: Paginar el historial o cargar solo datos recientes al inicio.

### Fiabilidad de Datos
- **Concurrencia**: No hay manejo de conflictos de escritura si dos usuarios editan al mismo tiempo.
- **Integridad**: Google Sheets no valida tipos de datos ni relaciones referenciales.

## 5. Recomendaciones Específicas de Código

1.  **Modularización**:
    - Extraer CSS a `css/styles.css`.
    - Extraer lógica de API a `js/api.js`.
    - Extraer lógica de UI a `js/ui.js`.
    - Mantener `index.html` limpio.

2.  **Mejoras de Código**:
    - Reemplazar `alert()` con notificaciones toast menos intrusivas.
    - Implementar un interceptor de errores global para capturar fallos de API y reintentar.
    - Usar `async/await` de forma consistente para mejorar la legibilidad del flujo asíncrono.

3.  **Seguridad**:
    - **URGENTE**: Restringir la API Key en Google Cloud Console.

4.  **Funcionalidades Futuras**:
    - **Modo Offline Real**: Usar `localStorage` para guardar una copia de los datos y permitir ver el repertorio sin internet (PWA).
    - **Transpositor de Acordes**: Añadir funcionalidad para cambiar el tono de las canciones si se implementa un formato de acordes estructurado.
