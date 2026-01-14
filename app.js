const { useState, useEffect, useCallback, useRef } = React;

// Componente principal
const HoneycombApp = () => {
    const [currentScreen, setCurrentScreen] = useState('login');
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [measuringPoints, setMeasuringPoints] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [peakRecords, setPeakRecords] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [useRealAPI, setUseRealAPI] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    
    // Refs para los inputs (evita problemas de foco)
    const usernameRef = useRef(null);
    const passwordRef = useRef(null);

    // Datos de ejemplo para modo demo
    const mockMeasuringPoints = [
        {
            id: 1, name: 'Metro L9 - Estación Los Leones', active: true, category: 'CAT2',
            guide_line: 'DS_38_2011', building_level: 'groundLevel',
            sensor: { serial: 'SWARM-M9-001', battery_level: 78, signal_strength: -62 },
            last_ppv: 4.8, alarm_level: 'normal', timezone: 'America/Santiago'
        },
        {
            id: 2, name: 'Tierra Amarilla - Vivienda Calle Copiapó 245', active: true, category: 'CAT1',
            guide_line: 'DS_38_2011', building_level: 'lowerLevel',
            sensor: { serial: 'SWARM-TA-01', battery_level: 45, signal_strength: -75 },
            last_ppv: 9.3, alarm_level: 'warning', timezone: 'America/Santiago'
        },
        {
            id: 3, name: 'Minera Los Pelambres - Receptor R-03', active: true, category: 'CAT3',
            guide_line: 'USBM_RI_8485', building_level: 'groundLevel',
            sensor: { serial: 'SWARM-LP-R03', battery_level: 88, signal_strength: -54 },
            last_ppv: 18.7, alarm_level: 'alert', timezone: 'America/Santiago'
        }
    ];

    const mockPeakRecords = [
        { time: '14:23:18', date: '14-01-2026', ppv_x: 1.8, ppv_y: 2.1, ppv_z: 4.8, freq_x: 12, freq_y: 15, freq_z: 18, ppv_max: 4.8, max_axis: 'Z', dominant_freq: 18 },
        { time: '14:28:45', date: '14-01-2026', ppv_x: 2.3, ppv_y: 3.2, ppv_z: 3.9, freq_x: 16, freq_y: 19, freq_z: 17, ppv_max: 3.9, max_axis: 'Z', dominant_freq: 17 },
        { time: '14:35:52', date: '14-01-2026', ppv_x: 3.1, ppv_y: 2.8, ppv_z: 5.2, freq_x: 14, freq_y: 18, freq_z: 16, ppv_max: 5.2, max_axis: 'Z', dominant_freq: 16 }
    ];

    // Verificar token guardado al iniciar
    useEffect(() => {
        if (window.HoneycombAPI?.isTokenValid()) {
            const storedToken = window.HoneycombAPI.getStoredToken();
            const storedUsername = window.HoneycombAPI.getStoredUsername();
            setToken(storedToken);
            setUsername(storedUsername || '');
            setUseRealAPI(true);
            setConnectionStatus('connecting');
            loadInitialData();
        }
    }, []);

    // Auto-refresh cada 5 segundos
    useEffect(() => {
        let interval;
        if (autoRefresh && currentScreen === 'dashboard' && token) {
            interval = setInterval(() => refreshData(), 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, currentScreen, token]);

    // Reinicializar iconos Lucide SOLO cuando cambia la pantalla
    useEffect(() => {
        const timer = setTimeout(() => {
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [currentScreen]); // SOLO currentScreen, no loading ni otros estados

    // Cargar datos iniciales con API real
    const loadInitialData = async () => {
        setLoading(true);
        setConnectionStatus('connecting');
        
        try {
            const result = await window.HoneycombAPI.getMeasuringPoints();
            
            if (result.ok && result.measuring_points) {
                const pointsWithPPV = await Promise.all(
                    result.measuring_points.map(async (point) => {
                        const latestPPV = await window.HoneycombAPI.getLatestPPV(point.id);
                        
                        let last_ppv = 0;
                        let alarm_level = 'normal';
                        
                        if (latestPPV.ok && latestPPV.record) {
                            const record = latestPPV.record;
                            last_ppv = Math.max(record.ppv_x || 0, record.ppv_y || 0, record.ppv_z || 0);
                            
                            if (point.category === 'CAT1') {
                                if (last_ppv > 8) alarm_level = 'alert';
                                else if (last_ppv > 6) alarm_level = 'warning';
                            } else if (point.category === 'CAT2') {
                                if (last_ppv > 12) alarm_level = 'alert';
                                else if (last_ppv > 8) alarm_level = 'warning';
                            } else if (point.category === 'CAT3') {
                                if (last_ppv > 20) alarm_level = 'alert';
                                else if (last_ppv > 15) alarm_level = 'warning';
                            }
                        }
                        
                        return {
                            ...point,
                            last_ppv: parseFloat(last_ppv.toFixed(1)),
                            alarm_level
                        };
                    })
                );
                
                setMeasuringPoints(pointsWithPPV);
                setCurrentScreen('dashboard');
                setConnectionStatus('connected');
                setLastUpdate(new Date());
            } else {
                setError(result.message || 'Error al cargar datos');
                setConnectionStatus('error');
            }
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('Error de conexión con Honeycomb');
            setConnectionStatus('error');
        }
        setLoading(false);
    };

    // Login con API real
    const handleLogin = async () => {
        const user = usernameRef.current?.value || username;
        const pass = passwordRef.current?.value || password;
        
        setLoading(true);
        setError('');
        
        if (!user || !pass) {
            setError('Por favor ingresa usuario y contraseña');
            setLoading(false);
            return;
        }
        
        try {
            setConnectionStatus('connecting');
            const result = await window.HoneycombAPI.authenticate(user, pass);
            
            if (result.ok && result.token) {
                setToken(result.token);
                setUsername(user);
                setUseRealAPI(true);
                await loadInitialData();
            } else {
                setError(result.message || 'Credenciales inválidas');
                setConnectionStatus('error');
            }
        } catch (err) {
            console.error('Error login:', err);
            setError('Error de conexión con Honeycomb');
            setConnectionStatus('error');
        }
        
        setLoading(false);
    };

    // Modo demo
    const handleDemoMode = () => {
        setUseRealAPI(false);
        setMeasuringPoints(mockMeasuringPoints);
        setCurrentScreen('dashboard');
        setConnectionStatus('demo');
        setLastUpdate(new Date());
    };

    // Refrescar datos
    const refreshData = async () => {
        if (!useRealAPI) {
            setLastUpdate(new Date());
            return;
        }
        
        try {
            const result = await window.HoneycombAPI.getMeasuringPoints();
            
            if (result.ok && result.measuring_points) {
                const pointsWithPPV = await Promise.all(
                    result.measuring_points.map(async (point) => {
                        const latestPPV = await window.HoneycombAPI.getLatestPPV(point.id);
                        
                        let last_ppv = 0;
                        let alarm_level = 'normal';
                        
                        if (latestPPV.ok && latestPPV.record) {
                            const record = latestPPV.record;
                            last_ppv = Math.max(record.ppv_x || 0, record.ppv_y || 0, record.ppv_z || 0);
                            
                            if (point.category === 'CAT1') {
                                if (last_ppv > 8) alarm_level = 'alert';
                                else if (last_ppv > 6) alarm_level = 'warning';
                            } else if (point.category === 'CAT2') {
                                if (last_ppv > 12) alarm_level = 'alert';
                                else if (last_ppv > 8) alarm_level = 'warning';
                            } else if (point.category === 'CAT3') {
                                if (last_ppv > 20) alarm_level = 'alert';
                                else if (last_ppv > 15) alarm_level = 'warning';
                            }
                        }
                        
                        return {
                            ...point,
                            last_ppv: parseFloat(last_ppv.toFixed(1)),
                            alarm_level
                        };
                    })
                );
                
                setMeasuringPoints(pointsWithPPV);
                setLastUpdate(new Date());
                setConnectionStatus('connected');
            }
        } catch (err) {
            console.error('Error al refrescar:', err);
        }
    };

    // Cargar detalles de punto
    const loadPointDetails = async (point) => {
        setSelectedPoint(point);
        setCurrentScreen('details');
        setLoading(true);
        
        try {
            if (useRealAPI && window.HoneycombAPI) {
                const result = await window.HoneycombAPI.getPeakRecords(point.id, 20);
                
                if (result.ok && result.records) {
                    const parsedRecords = window.HoneycombAPI.parseTriaxialData(result.records);
                    setPeakRecords(parsedRecords);
                } else {
                    setPeakRecords(mockPeakRecords);
                }
            } else {
                setPeakRecords(mockPeakRecords);
            }
        } catch (err) {
            console.error('Error al cargar detalles:', err);
            setPeakRecords(mockPeakRecords);
        }
        
        setLoading(false);
        
        // Actualizar iconos después de cargar detalles
        setTimeout(() => {
            if (window.lucide) lucide.createIcons();
        }, 100);
    };

    // Cerrar sesión
    const handleLogout = () => {
        if (window.HoneycombAPI) {
            window.HoneycombAPI.logout();
        }
        setToken('');
        setUsername('');
        setPassword('');
        setMeasuringPoints([]);
        setCurrentScreen('login');
        setConnectionStatus('disconnected');
        setUseRealAPI(true);
    };

    // ==================== PANTALLA LOGIN ====================
    if (currentScreen === 'login') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <div className="bg-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">Honeycomb</h1>
                        <p className="text-gray-500 mt-2">Monitor Omnidots SWARM</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario Honeycomb</label>
                            <input
                                ref={usernameRef}
                                type="text"
                                defaultValue={username}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="tu-usuario@empresa.cl"
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                            <input
                                ref={passwordRef}
                                type="password"
                                defaultValue={password}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                    </svg>
                                    Conectando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                        <polyline points="10 17 15 12 10 7"></polyline>
                                        <line x1="15" y1="12" x2="3" y2="12"></line>
                                    </svg>
                                    Iniciar Sesión
                                </>
                            )}
                        </button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">o</span>
                            </div>
                        </div>

                        <button
                            onClick={handleDemoMode}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10 8 16 12 10 16 10 8"></polygon>
                            </svg>
                            Entrar en Modo Demo
                        </button>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-4">
                            <p className="text-blue-800 font-semibold mb-1">ℹ️ Información</p>
                            <p className="text-blue-700">Usa tus credenciales de <strong>honeycomb.omnidots.com</strong> para conectarte a tus equipos SWARM reales.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== PANTALLA DASHBOARD ====================
    if (currentScreen === 'dashboard') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-500 text-white p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">Puntos de Medición</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`p-2 rounded-lg transition ${autoRefresh ? 'bg-blue-600' : 'hover:bg-blue-600'}`}
                                title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                            >
                                {autoRefresh ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="6" y="4" width="4" height="16"></rect>
                                        <rect x="14" y="4" width="4" height="16"></rect>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={refreshData}
                                className="p-2 hover:bg-blue-600 rounded-lg transition"
                                disabled={loading}
                                title="Refrescar"
                            >
                                <svg className={loading ? 'animate-spin' : ''} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="p-2 hover:bg-red-500 rounded-lg transition"
                                title="Cerrar sesión"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-blue-100 text-sm">
                        <span>{measuringPoints.filter(p => p.active).length} puntos activos | {lastUpdate.toLocaleTimeString('es-CL')}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            connectionStatus === 'connected' ? 'bg-green-500 text-white' :
                            connectionStatus === 'demo' ? 'bg-yellow-500 text-black' :
                            connectionStatus === 'connecting' ? 'bg-blue-400 text-white' :
                            'bg-red-500 text-white'
                        }`}>
                            {connectionStatus === 'connected' ? '🔌 API Real' :
                             connectionStatus === 'demo' ? '🎮 Demo' :
                             connectionStatus === 'connecting' ? '⏳ Conectando...' :
                             '❌ Desconectado'}
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {measuringPoints.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-8 text-center">
                            <svg className="mx-auto text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                            </svg>
                            <p className="text-gray-500">No hay puntos de medición disponibles</p>
                        </div>
                    ) : (
                        measuringPoints.map(point => (
                            <div
                                key={point.id}
                                onClick={() => loadPointDetails(point)}
                                className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">{point.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                                <rect x="9" y="9" width="6" height="6"></rect>
                                                <line x1="9" y1="1" x2="9" y2="4"></line>
                                                <line x1="15" y1="1" x2="15" y2="4"></line>
                                                <line x1="9" y1="20" x2="9" y2="23"></line>
                                                <line x1="15" y1="20" x2="15" y2="23"></line>
                                                <line x1="20" y1="9" x2="23" y2="9"></line>
                                                <line x1="20" y1="14" x2="23" y2="14"></line>
                                                <line x1="1" y1="9" x2="4" y2="9"></line>
                                                <line x1="1" y1="14" x2="4" y2="14"></line>
                                            </svg>
                                            <span>{point.sensor?.serial || 'Sin sensor'}</span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        point.alarm_level === 'normal' ? 'bg-green-100 text-green-700' :
                                        point.alarm_level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {point.alarm_level === 'normal' ? '✓ NORMAL' :
                                         point.alarm_level === 'warning' ? '⚠ ADVERTENCIA' : '🚨 ALERTA'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="text-center bg-blue-50 rounded-lg py-2">
                                        <div className="text-2xl font-bold text-blue-600">{point.last_ppv}</div>
                                        <div className="text-xs text-gray-500">PPV (mm/s)</div>
                                        <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            EN VIVO
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1">
                                            <svg className={point.sensor?.battery_level < 50 ? 'text-red-500' : 'text-green-500'} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect>
                                                <line x1="23" y1="13" x2="23" y2="11"></line>
                                            </svg>
                                            <span className="text-sm font-semibold">{Math.round(point.sensor?.battery_level || 0)}%</span>
                                        </div>
                                        <span className="text-xs text-gray-400">Batería</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1">
                                            <svg className="text-green-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                                <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                            </svg>
                                            <span className="text-sm font-semibold">{point.sensor?.signal_strength || 'N/A'}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">Señal</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                                    <span>{point.category} | {point.guide_line || 'Sin guía'}</span>
                                    <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                        </svg>
                                        {point.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==================== PANTALLA DETALLES ====================
    if (currentScreen === 'details') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-500 text-white p-4 shadow-lg">
                    <button
                        onClick={() => setCurrentScreen('dashboard')}
                        className="text-white mb-3 hover:underline flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Volver
                    </button>
                    <h1 className="text-xl font-bold mb-1">{selectedPoint?.name}</h1>
                    <p className="text-blue-100 text-sm">{selectedPoint?.sensor?.serial || 'Sin sensor'}</p>
                </div>

                <div className="p-4">
                    {/* Resumen del punto */}
                    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{selectedPoint?.last_ppv || 0}</div>
                                <div className="text-xs text-gray-500">Último PPV</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-700">{selectedPoint?.category || 'N/A'}</div>
                                <div className="text-xs text-gray-500">Categoría</div>
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${
                                    selectedPoint?.alarm_level === 'normal' ? 'text-green-600' :
                                    selectedPoint?.alarm_level === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                    {selectedPoint?.alarm_level === 'normal' ? '✓' :
                                     selectedPoint?.alarm_level === 'warning' ? '⚠' : '🚨'}
                                </div>
                                <div className="text-xs text-gray-500">Estado</div>
                            </div>
                        </div>
                    </div>

                    {/* Registros PPV */}
                    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="text-blue-500" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                <polyline points="17 6 23 6 23 12"></polyline>
                            </svg>
                            Registros Recientes PPV por Eje
                        </h2>

                        {loading ? (
                            <div className="text-center py-8">
                                <svg className="animate-spin mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="2" x2="12" y2="6"></line>
                                    <line x1="12" y1="18" x2="12" y2="22"></line>
                                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                    <line x1="2" y1="12" x2="6" y2="12"></line>
                                    <line x1="18" y1="12" x2="22" y2="12"></line>
                                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                </svg>
                                <p className="text-gray-500 mt-2">Cargando registros...</p>
                            </div>
                        ) : peakRecords.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                                </svg>
                                <p className="text-gray-500 mt-2">No hay registros disponibles</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {peakRecords.slice(0, 10).map((record, idx) => (
                                    <div key={idx} className="border-b last:border-0 pb-3 last:pb-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-semibold text-gray-800">
                                                <span className="text-blue-600">{record.date || 'Sin fecha'}</span>
                                                <span className="mx-2 text-gray-400">|</span>
                                                <span>{record.time || 'Sin hora'}</span>
                                            </div>
                                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                Máx: {record.max_axis || 'Z'} • {record.dominant_freq || 0} Hz
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-red-50 rounded-lg p-2 border-l-4 border-red-500">
                                                <div className="text-xs text-red-600 font-semibold mb-1">EJE X</div>
                                                <div className="text-lg font-bold text-red-700">{(record.ppv_x || 0).toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">mm/s</div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-red-600">≈ {record.freq_x || 0} Hz</span>
                                                </div>
                                            </div>

                                            <div className="bg-green-50 rounded-lg p-2 border-l-4 border-green-500">
                                                <div className="text-xs text-green-600 font-semibold mb-1">EJE Y</div>
                                                <div className="text-lg font-bold text-green-700">{(record.ppv_y || 0).toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">mm/s</div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-green-600">≈ {record.freq_y || 0} Hz</span>
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 rounded-lg p-2 border-l-4 border-blue-500">
                                                <div className="text-xs text-blue-600 font-semibold mb-1">EJE Z</div>
                                                <div className="text-lg font-bold text-blue-700">{(record.ppv_z || 0).toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">mm/s</div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-blue-600">≈ {record.freq_z || 0} Hz</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

// Renderizar aplicación
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HoneycombApp />);
