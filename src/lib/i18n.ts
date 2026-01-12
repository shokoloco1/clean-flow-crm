// Simple i18n system with Spanish as default language
// Can be extended to support multiple languages

type TranslationKey = keyof typeof translations.es;

const translations = {
  es: {
    // Common
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    view: "Ver",
    create: "Crear",
    search: "Buscar",
    filter: "Filtrar",
    filters: "Filtros",
    clear: "Limpiar",
    close: "Cerrar",
    back: "Volver",
    next: "Siguiente",
    previous: "Anterior",
    start: "Iniciar",
    complete: "Completar",
    logout: "Salir",
    login: "Iniciar Sesión",
    signup: "Crear Cuenta",
    submit: "Enviar",
    confirm: "Confirmar",
    yes: "Sí",
    no: "No",
    all: "Todos",
    none: "Ninguno",
    unknown: "Desconocido",
    
    // App
    appName: "CleanFlow",
    appTagline: "Gestiona tu negocio de limpieza",
    appDescription: "La plataforma integral de CRM y gestión de trabajos para empresas de limpieza comercial",
    adminDashboard: "Panel de Administración",
    staffDashboard: "Panel de Personal",
    
    // Navigation
    home: "Inicio",
    dashboard: "Dashboard",
    jobs: "Trabajos",
    clients: "Clientes",
    properties: "Propiedades",
    staff: "Personal",
    calendar: "Calendario",
    settings: "Configuración",
    checklists: "Checklists",
    recurring: "Trabajos Recurrentes",
    reports: "Reportes",
    
    // Auth
    welcome: "Bienvenido",
    welcomeBack: "¡Bienvenido de vuelta!",
    signInToAccount: "Inicia sesión en tu cuenta o crea una nueva",
    professionalCleaningManagement: "Gestión profesional de limpieza",
    email: "Email",
    password: "Contraseña",
    fullName: "Nombre Completo",
    accountType: "Tipo de Cuenta",
    admin: "Admin (Propietario)",
    staffRole: "Staff (Limpiador)",
    signingIn: "Iniciando sesión...",
    creatingAccount: "Creando cuenta...",
    invalidCredentials: "Credenciales inválidas. Verifica tu email y contraseña.",
    accountCreated: "¡Cuenta creada exitosamente!",
    emailAlreadyRegistered: "Este email ya está registrado. Inicia sesión en su lugar.",
    noRoleAssigned: "Tu cuenta no tiene un rol asignado",
    pendingAccess: "Acceso pendiente",
    pendingAccessDescription: "Para entrar, un administrador debe asignarte un rol (admin o staff).",
    configureAsAdmin: "Configurar como Admin (solo 1ª vez)",
    configuring: "Configurando...",
    roleAdminAssigned: "Rol admin asignado. Redirigiendo...",
    noRoleContactAdmin: "Tu cuenta no tiene rol asignado. Pídele al admin que te asigne uno.",
    
    // Dashboard
    todaysJobs: "Trabajos de Hoy",
    completedToday: "Completados Hoy",
    completionRate: "Tasa de Completitud",
    totalStaff: "Total Personal",
    upcomingJobs: "Próximos Trabajos",
    noJobsScheduled: "No hay trabajos programados",
    viewTutorial: "Ver tutorial",
    
    // Quick Actions
    newJob: "Nuevo Trabajo",
    scheduleClean: "Programar limpieza",
    manageLocations: "Gestionar ubicaciones",
    manageClients: "Gestionar clientes",
    manageTemplates: "Gestionar plantillas",
    manageTeam: "Gestionar equipo",
    viewSchedule: "Ver agenda",
    autoSchedule: "Auto-programar",
    systemConfig: "Configuración sistema",
    
    // Jobs
    jobDetails: "Detalles del Trabajo",
    location: "Ubicación",
    scheduledDate: "Fecha Programada",
    scheduledTime: "Hora Programada",
    schedule: "Agenda",
    startTime: "Hora Inicio",
    endTime: "Hora Fin",
    duration: "Duración",
    status: "Estado",
    notes: "Notas",
    notesFromAdmin: "Notas del Admin",
    assignedStaff: "Personal Asignado",
    accessCodes: "Códigos de Acceso",
    checklist: "Lista de Tareas",
    photos: "Fotos",
    evidencePhotos: "Fotos de Evidencia",
    before: "Antes",
    after: "Después",
    noPhotosUploaded: "No hay fotos subidas aún",
    uploadPhotoToComplete: "Sube al menos una foto para completar el trabajo",
    uploadPhotos: "Subir Fotos",
    takePhoto: "Tomar Foto",
    selectFromGallery: "Seleccionar de Galería",
    photosUploaded: "foto(s) subida(s)!",
    createJob: "Crear Trabajo",
    jobCreated: "¡Trabajo creado exitosamente!",
    failedToCreateJob: "Error al crear trabajo",
    fillRequiredFields: "Por favor completa todos los campos requeridos",
    selectClient: "Seleccionar cliente",
    selectStaff: "Seleccionar personal",
    enterOneItemPerLine: "Un ítem por línea",
    
    // Job Status
    pending: "Pendiente",
    inProgress: "En Progreso",
    completed: "Completado",
    cancelled: "Cancelado",
    
    // Geofence
    verifyLocation: "Verificar Ubicación",
    verifyingLocation: "Verificando...",
    locationVerified: "Ubicación Verificada",
    outsideArea: "Fuera del Área",
    checkLocationFirst: "Primero verifica tu ubicación",
    gpsNotAvailable: "GPS no disponible en este dispositivo",
    couldNotCaptureGPS: "No se pudo capturar ubicación GPS.",
    outsideGeofence: "Estás a {distance}m de la propiedad. Debes estar a menos de {radius}m.",
    checkInOutsideArea: "Check-in fuera del área permitida. Distancia: {distance}m (máximo: {radius}m)",
    noPropertyAssigned: "Este trabajo no tiene propiedad asignada",
    
    // Actions
    startJob: "Iniciar Trabajo",
    completeJob: "Completar Trabajo",
    startingJob: "Iniciando...",
    completingJob: "Completando...",
    jobStarted: "Trabajo iniciado",
    jobStartedWithLocation: "¡Trabajo iniciado con ubicación verificada!",
    jobCompleted: "¡Trabajo completado! Excelente trabajo!",
    errorStartingJob: "Error al iniciar trabajo",
    errorCompletingJob: "Error al completar trabajo",
    uploadPhotoFirst: "Sube al menos una foto antes de completar",
    openMaps: "Abrir en Mapas",
    downloadPDF: "Descargar PDF",
    generatingPDF: "Generando PDF...",
    
    // Alerts
    activeAlerts: "Alertas Activas",
    noActiveAlerts: "Sin alertas pendientes",
    loadingAlerts: "Cargando alertas...",
    alertResolved: "Alerta resuelta",
    newAlertReceived: "Nueva alerta recibida",
    lateArrival: "Llegada Tardía",
    noShow: "No Presentación",
    geofenceViolation: "Fuera de Área",
    earlyCheckout: "Salida Temprana",
    
    // Activity Feed
    liveFeed: "Feed en Vivo",
    noActivityYet: "No hay actividad aún hoy",
    startedWork: "inició",
    completedWork: "completó",
    
    // Search
    searchPlaceholder: "Buscar trabajos, clientes, propiedades...",
    noResultsFound: "No se encontraron resultados.",
    typeToSearchOrFilter: "Escribe para buscar o usa los filtros",
    jobStatus: "Estado del trabajo",
    allStatuses: "Todos los estados",
    assignedStaffLabel: "Staff asignado",
    allStaff: "Todo el staff",
    dateFrom: "Desde",
    dateTo: "Hasta",
    job: "Trabajo",
    client: "Cliente",
    property: "Propiedad",
    
    // Client Portal
    clientPortal: "Portal de Clientes",
    accessPortal: "Acceso al Portal",
    enterAccessCode: "Ingresa tu código de acceso único para ver tus trabajos de limpieza",
    accessCode: "Código de acceso",
    enterAccessCodePlaceholder: "Ingresa tu código de acceso",
    verifying: "Verificando...",
    accessPortalButton: "Acceder al Portal",
    noAccessCode: "¿No tienes un código? Contacta a tu proveedor de servicios de limpieza.",
    invalidAccessCode: "Código de acceso inválido o sin trabajos registrados",
    portalAccessError: "Error al acceder al portal. Verifica tu código de acceso.",
    welcomeClient: "Bienvenido, {name}",
    portalWelcomeMessage: "Aquí puedes ver el historial de servicios de limpieza realizados y programados.",
    scheduled: "Programados",
    serviceDetails: "Detalle del Servicio",
    servicePhotos: "Fotos del Servicio",
    poweredBy: "Powered by CleanFlow",
    
    // Onboarding
    welcomeToCleanFlow: "¡Bienvenido a CleanFlow!",
    yourProfessionalPlatform: "Tu plataforma de gestión de limpieza profesional",
    onboardingDetail1: "Gestiona todos tus trabajos de limpieza en un solo lugar",
    onboardingDetail2: "Controla el rendimiento de tu equipo en tiempo real",
    onboardingDetail3: "Genera reportes profesionales para tus clientes",
    jobManagement: "Gestión de Trabajos",
    jobManagementDesc: "Programa y supervisa trabajos fácilmente",
    jobManagementDetail1: "Crea trabajos con checklists personalizados",
    jobManagementDetail2: "Asigna personal a cada trabajo",
    jobManagementDetail3: "Seguimiento en tiempo real del progreso",
    clientsAndProperties: "Clientes y Propiedades",
    clientsAndPropertiesDesc: "Organiza tu cartera de clientes",
    clientsDetail1: "Registra clientes con sus datos de contacto",
    clientsDetail2: "Gestiona múltiples propiedades por cliente",
    clientsDetail3: "Portal exclusivo para que tus clientes vean su historial",
    geofencingControl: "Geofencing y Control",
    geofencingDesc: "Verificación automática de ubicación",
    geofencingDetail1: "Check-in/check-out validado por GPS",
    geofencingDetail2: "Alertas automáticas por llegadas tardías",
    geofencingDetail3: "Evidencia fotográfica antes y después",
    calendarRecurrence: "Calendario y Recurrencia",
    calendarDesc: "Planifica con anticipación",
    calendarDetail1: "Vista de calendario interactivo",
    calendarDetail2: "Trabajos recurrentes automáticos",
    calendarDetail3: "Gestiona la disponibilidad del personal",
    reportsMetrics: "Reportes y Métricas",
    reportsDesc: "Toma decisiones informadas",
    reportsDetail1: "Dashboard con métricas clave",
    reportsDetail2: "Exporta reportes en PDF y CSV",
    reportsDetail3: "Análisis de rendimiento por período",
    letsStart: "¡Empezar!",
    
    // Timeline
    timeline: "Línea de Tiempo",
    details: "Detalles",
    jobCreatedEvent: "Trabajo creado",
    jobStartedEvent: "Trabajo iniciado",
    checklistItemCompleted: "{task} completado",
    issueReported: "Problema reportado en {task}",
    photosUploadedEvent: "{count} {type} subida(s)",
    alertGeneratedEvent: "Alerta: {type}",
    jobCompletedEvent: "Trabajo completado",
    jobCancelledEvent: "Trabajo cancelado",
    
    // Breadcrumbs
    adminPanel: "Panel Admin",
    staffPanel: "Panel Staff",
    authentication: "Autenticación",
    
    // Landing page
    getStarted: "Comenzar",
    signIn: "Iniciar Sesión",
    clientPortalAccess: "Acceso Portal de Clientes",
    everythingYouNeed: "Todo lo que Necesitas para Tu Negocio",
    proofOfWork: "Prueba de Trabajo",
    proofOfWorkDesc: "Captura fotos antes y después para responsabilidad",
    locationTracking: "Seguimiento de Ubicación",
    locationTrackingDesc: "Navegación con un toque al sitio de trabajo",
    teamCoordination: "Coordinación de Equipo",
    teamCoordinationDesc: "Asigna trabajos y monitorea rendimiento del personal",
    forBusinessOwners: "Para Propietarios de Negocios",
    fullDashboardAnalytics: "Dashboard completo con analíticas",
    createScheduleJobs: "Crear y programar trabajos",
    manageClientsStaff: "Gestionar clientes y personal",
    trackJobCompletion: "Seguimiento de trabajos en tiempo real",
    forCleaningStaff: "Para Personal de Limpieza",
    mobileFirstInterface: "Interfaz móvil primero",
    viewDailyJobs: "Ver trabajos asignados del día",
    oneTapNavigation: "Navegación con un toque a sitios",
    uploadBeforeAfter: "Subir fotos antes/después",
    streamlineOperations: "Optimiza las operaciones de tu negocio de limpieza",
    
    // 404 Page
    pageNotFound: "Página No Encontrada",
    oopsLostInClouds: "¡Ups! Parece que te perdiste en las nubes",
    pageDoesntExist: "La página que buscas no existe o fue movida.",
    backToHome: "Volver al Inicio",
    tryThese: "¿Quizás buscabas una de estas?",
    
    // Errors
    error: "Error",
    somethingWentWrong: "Algo salió mal",
    tryAgain: "Intentar de nuevo",
    failedToLoad: "Error al cargar",
    failedToSave: "Error al guardar",
    failedToUpload: "Error al subir",
    
    // Form validation
    required: "Requerido",
    invalidEmail: "Email inválido",
    passwordTooShort: "Contraseña muy corta",
    pleaseCorrectErrors: "Por favor corrige los errores del formulario",
  },
};

export type Language = keyof typeof translations;

let currentLanguage: Language = "es";

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[currentLanguage][key] || key;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  
  return text;
}

// Export all translation keys for type safety
export type { TranslationKey };
export { translations };
