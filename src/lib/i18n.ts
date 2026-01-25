// i18n system with English as default language for Australian market
// Supports English (default) and Spanish for Latino workforce

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    create: "Create",
    search: "Search",
    filter: "Filter",
    filters: "Filters",
    clear: "Clear",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    start: "Start",
    complete: "Complete",
    logout: "Sign Out",
    login: "Sign In",
    signup: "Create Account",
    submit: "Submit",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    unknown: "Unknown",
    
    // App
    appName: "CleanFlow",
    appTagline: "Manage your cleaning business without the stress",
    appDescription: "100% specialised in cleaning. No features you don't need. No complications you don't want.",
    adminDashboard: "Admin Dashboard",
    staffDashboard: "Staff Dashboard",
    
    // Navigation
    home: "Home",
    dashboard: "Dashboard",
    jobs: "Jobs",
    clients: "Clients",
    properties: "Properties",
    staff: "Staff",
    calendar: "Calendar",
    settings: "Settings",
    checklists: "Checklists",
    recurring: "Recurring Jobs",
    reports: "Reports",
    invoices: "Invoices",
    pricing: "Pricing",
    
    // Auth
    welcome: "Welcome",
    welcomeBack: "Welcome back!",
    signInToAccount: "Sign in to your account or create a new one",
    professionalCleaningManagement: "Professional cleaning management",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    accountType: "Account Type",
    admin: "Admin (Owner)",
    staffRole: "Staff (Cleaner)",
    signingIn: "Signing in...",
    creatingAccount: "Creating account...",
    invalidCredentials: "Invalid credentials. Please check your email and password.",
    accountCreated: "Account created successfully!",
    emailAlreadyRegistered: "This email is already registered. Please sign in instead.",
    noRoleAssigned: "Your account doesn't have a role assigned",
    pendingAccess: "Access pending",
    pendingAccessDescription: "To access the system, an admin must assign you a role (admin or staff).",
    configureAsAdmin: "Configure as Admin (first time only)",
    configuring: "Configuring...",
    roleAdminAssigned: "Admin role assigned. Redirecting...",
    noRoleContactAdmin: "Your account has no role assigned. Please ask an admin to assign one.",
    
    // Dashboard
    todaysJobs: "Today's Jobs",
    completedToday: "Completed Today",
    completionRate: "Completion Rate",
    totalStaff: "Total Staff",
    upcomingJobs: "Upcoming Jobs",
    noJobsScheduled: "No jobs scheduled",
    viewTutorial: "View tutorial",
    
    // Quick Actions
    newJob: "New Job",
    scheduleClean: "Schedule cleaning",
    manageLocations: "Manage locations",
    manageClients: "Manage clients",
    manageTemplates: "Manage templates",
    manageTeam: "Manage team",
    viewSchedule: "View schedule",
    autoSchedule: "Auto-schedule",
    systemConfig: "System settings",
    generateInvoices: "Generate invoices",
    priceList: "Price list",
    
    // Jobs
    jobDetails: "Job Details",
    location: "Location",
    scheduledDate: "Scheduled Date",
    scheduledTime: "Scheduled Time",
    schedule: "Schedule",
    startTime: "Start Time",
    endTime: "End Time",
    duration: "Duration",
    status: "Status",
    notes: "Notes",
    notesFromAdmin: "Notes from Admin",
    assignedStaff: "Assigned Staff",
    accessCodes: "Access Codes",
    checklist: "Checklist",
    photos: "Photos",
    evidencePhotos: "Evidence Photos",
    before: "Before",
    after: "After",
    noPhotosUploaded: "No photos uploaded yet",
    uploadPhotoToComplete: "Upload at least one photo to complete the job",
    uploadPhotos: "Upload Photos",
    takePhoto: "Take Photo",
    selectFromGallery: "Select from Gallery",
    photosUploaded: "photo(s) uploaded!",
    createJob: "Create Job",
    jobCreated: "Job created successfully!",
    failedToCreateJob: "Failed to create job",
    fillRequiredFields: "Please fill in all required fields",
    selectClient: "Select client",
    selectStaff: "Select staff",
    enterOneItemPerLine: "One item per line",
    
    // Job Status
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    
    // Geofence
    verifyLocation: "Verify Location",
    verifyingLocation: "Verifying...",
    locationVerified: "Location Verified",
    outsideArea: "Outside Area",
    checkLocationFirst: "Verify your location first",
    gpsNotAvailable: "GPS not available on this device",
    couldNotCaptureGPS: "Could not capture GPS location.",
    outsideGeofence: "You are {distance}m from the property. You must be within {radius}m.",
    checkInOutsideArea: "Check-in outside allowed area. Distance: {distance}m (maximum: {radius}m)",
    noPropertyAssigned: "This job has no property assigned",
    
    // Actions
    startJob: "Start Job",
    completeJob: "Complete Job",
    startingJob: "Starting...",
    completingJob: "Completing...",
    jobStarted: "Job started",
    jobStartedWithLocation: "Job started - location verified",
    jobCompleted: "Job completed",
    errorStartingJob: "Couldn't start job. Please try again.",
    errorCompletingJob: "Couldn't complete job. Please try again.",
    uploadPhotoFirst: "Please upload at least one photo to complete",
    openMaps: "Open in Maps",
    downloadPDF: "Download PDF",
    generatingPDF: "Generating PDF...",
    
    // Alerts
    activeAlerts: "Active Alerts",
    noActiveAlerts: "No pending alerts",
    loadingAlerts: "Loading alerts...",
    alertResolved: "Alert resolved",
    newAlertReceived: "New alert received",
    lateArrival: "Late Arrival",
    noShow: "No Show",
    geofenceViolation: "Outside Area",
    earlyCheckout: "Early Checkout",
    
    // Activity Feed
    liveFeed: "Live Feed",
    noActivityYet: "No activity yet today",
    startedWork: "started",
    completedWork: "completed",
    
    // Search
    searchPlaceholder: "Search jobs, clients, properties...",
    noResultsFound: "No results found.",
    typeToSearchOrFilter: "Type to search or use filters",
    jobStatus: "Job status",
    allStatuses: "All statuses",
    assignedStaffLabel: "Assigned staff",
    allStaff: "All staff",
    dateFrom: "From",
    dateTo: "To",
    job: "Job",
    client: "Client",
    property: "Property",
    
    // Client Portal
    clientPortal: "Client Portal",
    accessPortal: "Portal Access",
    enterAccessCode: "Enter your unique access code to view your cleaning jobs",
    accessCode: "Access code",
    enterAccessCodePlaceholder: "Enter your access code",
    verifying: "Verifying...",
    accessPortalButton: "Access Portal",
    noAccessCode: "Don't have a code? Contact your cleaning service provider.",
    invalidAccessCode: "Invalid access code or no jobs registered",
    portalAccessError: "Error accessing portal. Please check your access code.",
    welcomeClient: "Welcome, {name}",
    portalWelcomeMessage: "Here you can view the history of completed and scheduled cleaning services.",
    scheduled: "Scheduled",
    serviceDetails: "Service Details",
    servicePhotos: "Service Photos",
    poweredBy: "Powered by CleanFlow",
    
    // Onboarding
    welcomeToCleanFlow: "Welcome to CleanFlow!",
    yourProfessionalPlatform: "Your professional cleaning management platform",
    onboardingDetail1: "Manage all your cleaning jobs in one place",
    onboardingDetail2: "Track your team's performance in real-time",
    onboardingDetail3: "Generate professional reports for your clients",
    jobManagement: "Job Management",
    jobManagementDesc: "Schedule and track jobs easily",
    jobManagementDetail1: "Create jobs with custom checklists",
    jobManagementDetail2: "Assign staff to each job",
    jobManagementDetail3: "Real-time progress tracking",
    clientsAndProperties: "Clients & Properties",
    clientsAndPropertiesDesc: "Organise your client portfolio",
    clientsDetail1: "Register clients with contact details",
    clientsDetail2: "Manage multiple properties per client",
    clientsDetail3: "Exclusive portal for clients to view their history",
    geofencingControl: "Geofencing & Control",
    geofencingDesc: "Automatic location verification",
    geofencingDetail1: "GPS-validated check-in/check-out",
    geofencingDetail2: "Automatic alerts for late arrivals",
    geofencingDetail3: "Before and after photo evidence",
    calendarRecurrence: "Calendar & Recurrence",
    calendarDesc: "Plan ahead",
    calendarDetail1: "Interactive calendar view",
    calendarDetail2: "Automatic recurring jobs",
    calendarDetail3: "Manage staff availability",
    reportsMetrics: "Reports & Metrics",
    reportsDesc: "Make informed decisions",
    reportsDetail1: "Dashboard with key metrics",
    reportsDetail2: "Export reports as PDF and CSV",
    reportsDetail3: "Performance analysis by period",
    letsStart: "Let's Start!",
    
    // Timeline
    timeline: "Timeline",
    details: "Details",
    jobCreatedEvent: "Job created",
    jobStartedEvent: "Job started",
    checklistItemCompleted: "{task} completed",
    issueReported: "Issue reported on {task}",
    photosUploadedEvent: "{count} {type} uploaded",
    alertGeneratedEvent: "Alert: {type}",
    jobCompletedEvent: "Job completed",
    jobCancelledEvent: "Job cancelled",
    
    // Breadcrumbs
    adminPanel: "Admin Panel",
    staffPanel: "Staff Panel",
    authentication: "Authentication",
    
    // Landing page
    getStarted: "Get Started",
    signIn: "Sign In",
    clientPortalAccess: "Client Portal Access",
    everythingYouNeed: "Everything You Need for Your Business",
    proofOfWork: "Proof of Work",
    proofOfWorkDesc: "Capture before & after photos for accountability",
    locationTracking: "Location Tracking",
    locationTrackingDesc: "One-tap navigation to job site",
    teamCoordination: "Team Coordination",
    teamCoordinationDesc: "Assign jobs and monitor staff performance",
    forBusinessOwners: "For Business Owners",
    fullDashboardAnalytics: "Full dashboard with analytics",
    createScheduleJobs: "Create and schedule jobs",
    manageClientsStaff: "Manage clients and staff",
    trackJobCompletion: "Real-time job tracking",
    forCleaningStaff: "For Cleaning Staff",
    mobileFirstInterface: "Mobile-first interface",
    viewDailyJobs: "View assigned jobs for the day",
    oneTapNavigation: "One-tap navigation to sites",
    uploadBeforeAfter: "Upload before/after photos",
    streamlineOperations: "Streamline your cleaning business operations",
    
    // Hero/Landing
    heroTitle: "Manage your cleaning business without the stress",
    heroSubtitle: "100% specialised in cleaning. No features you don't need. No complications you don't want.",
    benefit1: "Setup in 3 clicks",
    benefit2: "Australian owned",
    benefit3: "Bilingual (EN/ES)",
    benefit4: "Mobile-first design",
    startFreeTrial: "Start Free Trial",
    alreadyHaveAccount: "Already have an account",
    setupInMinutes: "Setup in less than 2 minutes",
    noCreditCard: "No credit card required",
    forOwners: "For Business Owners",
    forStaff: "For Cleaning Staff",
    dashboardAnalytics: "Full dashboard with analytics",
    mobileFirst: "Mobile-first interface",
    viewAssignedJobs: "View assigned jobs for the day",
    oneTapNav: "One-tap navigation to sites",
    uploadBeforeAfterPhotos: "Upload before/after photos",
    
    // Client Portal Section
    areYouClient: "Are you a cleaning company client?",
    accessClientPortal: "Access the client portal to view your service history",
    
    // Trust indicators
    australianOwned: "Australian Owned",
    securePayments: "Secure Payments",
    mobileApps: "iOS & Android",
    trustedBy: "Trusted by cleaning businesses across Australia",
    jobsCompleted: "Jobs Completed",
    happyBusinesses: "Happy Businesses",
    averageRating: "Average Rating",
    
    // 404 Page
    pageNotFound: "Page Not Found",
    oopsLostInClouds: "Oops! Looks like you got lost in the clouds",
    pageDoesntExist: "The page you're looking for doesn't exist or has been moved.",
    backToHome: "Back to Home",
    tryThese: "Maybe you were looking for one of these?",
    
    // Errors - Professional, friendly tone (from brand manual)
    error: "Error",
    somethingWentWrong: "Something went wrong. Please try again.",
    tryAgain: "Try again",
    failedToLoad: "Couldn't load data",
    failedToSave: "Couldn't save changes",
    failedToUpload: "Couldn't upload file",
    
    // Form validation - Friendly, helpful tone
    required: "This field is required",
    invalidEmail: "Please enter a valid email address",
    passwordTooShort: "Password needs to be longer",
    pleaseCorrectErrors: "Please check the highlighted fields",
    
    // Invoicing
    invoicing: "Invoicing",
    invoiceNumber: "Invoice Number",
    issueDate: "Issue Date",
    dueDate: "Due Date",
    subtotal: "Subtotal",
    gst: "GST (10%)",
    total: "Total",
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    taxInvoice: "Tax Invoice",
    gstIncluded: "GST Included",
    
    // Australian specific
    abn: "ABN",
    abnNumber: "ABN Number",
    businessName: "Business Name",
    
    // Success messages - Clean, professional (brand manual)
    success: "Done",
    clientCreated: "Client created",
    clientUpdated: "Client updated",
    invoiceCreated: "Invoice created",
    
    // Settings
    companySettings: "Company Settings",
    companyName: "Company Name",
    companyLogo: "Company Logo",
    geofenceRadius: "Geofence Radius",
    workingHours: "Working Hours",
    workingDays: "Working Days",
    
    // Subscription/Pricing
    choosePlan: "Choose Your Plan",
    monthly: "Monthly",
    yearly: "Yearly",
    savePercent: "Save {percent}%",
    currentPlan: "Current Plan",
    subscribe: "Subscribe",
    manageSubscription: "Manage Subscription",
    subscriptionActive: "Subscription Active",
    perMonth: "/month",
    perYear: "/year",
    billedAnnually: "Billed annually",
    features: "Features",
    mostPopular: "Most Popular",
    
    // Footer
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    allRightsReserved: "All rights reserved",
  },
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
    appTagline: "Gestiona tu negocio de limpieza sin estrés",
    appDescription: "100% especializado en limpieza. Sin funciones que no necesitas. Sin complicaciones que no quieres.",
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
    invoices: "Facturas",
    pricing: "Precios",
    
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
    generateInvoices: "Generar facturas",
    priceList: "Lista de precios",
    
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
    jobStartedWithLocation: "Trabajo iniciado - ubicación verificada",
    jobCompleted: "Trabajo completado",
    errorStartingJob: "No se pudo iniciar. Inténtalo de nuevo.",
    errorCompletingJob: "No se pudo completar. Inténtalo de nuevo.",
    uploadPhotoFirst: "Sube al menos una foto para completar",
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
    
    // Hero/Landing
    heroTitle: "Gestiona tu negocio de limpieza sin estrés",
    heroSubtitle: "100% especializado en limpieza. Sin funciones que no necesitas. Sin complicaciones que no quieres.",
    benefit1: "Config. en 3 clics",
    benefit2: "Empresa australiana",
    benefit3: "Bilingüe (EN/ES)",
    benefit4: "Diseño mobile-first",
    startFreeTrial: "Empezar Gratis",
    alreadyHaveAccount: "Ya tengo cuenta",
    setupInMinutes: "Configuración en menos de 2 minutos",
    noCreditCard: "Sin tarjeta de crédito",
    forOwners: "Para Dueños y Admins",
    forStaff: "Para el Equipo de Limpieza",
    dashboardAnalytics: "Dashboard con todas las métricas clave",
    mobileFirst: "App súper fácil de usar desde el celular",
    viewAssignedJobs: "Ve tus trabajos del día de un vistazo",
    oneTapNav: "Navega al lugar con un solo toque",
    uploadBeforeAfterPhotos: "Sube fotos antes/después",
    
    // Client Portal Section
    areYouClient: "¿Eres cliente de una empresa de limpieza?",
    accessClientPortal: "Accede al portal de clientes para ver el historial de servicios",
    
    // Trust indicators
    australianOwned: "Empresa Australiana",
    securePayments: "Pagos Seguros",
    mobileApps: "iOS y Android",
    trustedBy: "Empresas de limpieza en toda Australia confían en nosotros",
    jobsCompleted: "Trabajos Completados",
    happyBusinesses: "Empresas Felices",
    averageRating: "Calificación Promedio",
    
    // 404 Page
    pageNotFound: "Página No Encontrada",
    oopsLostInClouds: "¡Ups! Parece que te perdiste en las nubes",
    pageDoesntExist: "La página que buscas no existe o fue movida.",
    backToHome: "Volver al Inicio",
    tryThese: "¿Quizás buscabas una de estas?",
    
    // Errors - Professional tone (from brand manual)
    error: "Error",
    somethingWentWrong: "Algo salió mal. Inténtalo de nuevo.",
    tryAgain: "Intentar de nuevo",
    failedToLoad: "No se pudo cargar",
    failedToSave: "No se pudo guardar",
    failedToUpload: "No se pudo subir",
    
    // Form validation - Friendly tone
    required: "Campo requerido",
    invalidEmail: "Ingresa un email válido",
    passwordTooShort: "La contraseña es muy corta",
    pleaseCorrectErrors: "Por favor revisa los campos marcados",
    
    // Invoicing
    invoicing: "Facturación",
    newInvoice: "Nueva Factura",
    invoiceNumber: "Número de Factura",
    issueDate: "Fecha de Emisión",
    dueDate: "Fecha de Vencimiento",
    subtotal: "Subtotal",
    gst: "GST (10%)",
    total: "Total",
    draft: "Borrador",
    sent: "Enviada",
    paid: "Pagada",
    overdue: "Vencida",
    taxInvoice: "Factura con Impuestos",
    gstIncluded: "GST Incluido",
    
    // Australian specific
    abn: "ABN",
    abnNumber: "Número de ABN",
    businessName: "Nombre de Empresa",
    
    // Success messages - Clean, professional (brand manual)
    success: "Listo",
    clientCreated: "Cliente creado",
    clientUpdated: "Cliente actualizado",
    invoiceCreated: "Factura creada",
    
    // Settings
    companySettings: "Configuración de Empresa",
    companyName: "Nombre de Empresa",
    companyLogo: "Logo de Empresa",
    geofenceRadius: "Radio de Geofence",
    workingHours: "Horas de Trabajo",
    workingDays: "Días de Trabajo",
    
    // Subscription/Pricing
    choosePlan: "Elige Tu Plan",
    monthly: "Mensual",
    yearly: "Anual",
    savePercent: "Ahorra {percent}%",
    currentPlan: "Plan Actual",
    subscribe: "Suscribirse",
    manageSubscription: "Gestionar Suscripción",
    subscriptionActive: "Suscripción Activa",
    perMonth: "/mes",
    perYear: "/año",
    billedAnnually: "Facturado anualmente",
    features: "Características",
    mostPopular: "Más Popular",
    
    // Footer
    termsOfService: "Términos de Servicio",
    privacyPolicy: "Política de Privacidad",
    allRightsReserved: "Todos los derechos reservados",
  },
};

export type Language = keyof typeof translations;

// Get initial language from localStorage or default to English
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('cleanflow-language');
    if (stored === 'en' || stored === 'es') {
      return stored;
    }
  }
  return "en"; // Default to English for Australian market
};

let currentLanguage: Language = getInitialLanguage();

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('cleanflow-language', lang);
  }
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[currentLanguage][key] || translations.en[key] || key;
  
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
