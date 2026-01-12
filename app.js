const { useState, useEffect } = React;

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
        { time: '14:23:18', ppv_x: 1.8, ppv_y: 2.1, ppv_z: 4.8, freq_x: 12, freq_y: 15, freq_z: 18, ppv_max: 4.8, max_axis: 'Z', dominant_freq: 18 },
        { time: '14:28:45', ppv_x: 2.3, ppv_y: 3.2, ppv_z: 3.9, freq_x: 16, freq_y: 19, freq_z: 17, ppv_max: 3.9, max_axis: 'Z', dominant_freq: 17 },
        { time: '14:35:52', ppv_x: 3.1, ppv_y: 2.8, ppv_z: 5.2, freq_x: 14, freq_y: 18, freq_z: 16, ppv_max: 5.2, max_axis: 'Z', dominant_freq: 16 }
    ];

    // Verificar token guardado al iniciar
    useEffect(() => {
        const storedToken = window.HoneycombAPI?.getStoredToken();
        if (storedToken && window.HoneycombAPI?.isTokenValid()) {
            setToken(storedToken);
            setUseRealAPI(true);
            loadInitialData(storedToken);
        }
    }, []);

    // Auto-refresh
    useEffect(() => {
        let interval;
        if (autoRefresh && currentScreen === 'dashboard' && token) {
            interval = setInterval(() => refreshData(), 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, currentScreen, token]);

    // Cargar datos iniciales con API real
    const loadInitialData = async (authToken) => {
        setLoading(true);
        try {
            const result = await window.HoneycombAPI.getMeasuringPoints(authToken);
            
            if (result.ok && result.measuring_points) {
                const pointsWithPPV = await Promise.all(
                    result.measuring_points.map(async (point) => {
                        const latestPPV = await window.HoneycombAPI.getLatestPPV(authToken, point.id);
                        
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
            } else {
                setError(result.message || 'Error al cargar datos');
            }
        } catch (err) {
            setError('Error de conexión');
        }
        setLoading(false);
    };

    // Login con API real o modo demo
    const handleLogin = async () => {
        setLoading(true);
        setError('');
        
        if (!username || !password) {
            setError('Por favor ingresa usuario y contraseña');
            setLoading(false);
            return;
        }
        
        try {
            // Intentar login real con API Honeycomb
            const result = await window.HoneycombAPI.authenticate(username, password);
            
            if (result.ok && result.token) {
                setToken(result.token);
                setUseRealAPI(true);
                await loadInitialData(result.token);
            } else {
                setError(result.message || 'Credenciales inválidas. Intenta con API real de Honeycomb.');
            }
        } catch (err) {
            setError('Error de conexión con Honeycomb');
        }
        
        setLoading(false);
    };

    // Refrescar datos
    const refreshData = async () => {
        if (!token) return;
        
        setLoading(true);
        try {
            if (useRealAPI && window.HoneycombAPI) {
                const result = await window.HoneycombAPI.getMeasuringPoints(token);
                
                if (result.ok && result.measuring_points) {
                    const pointsWithPPV = await Promise.all(
                        result.measuring_points.map(async (point) => {
                            const latestPPV = await window.HoneycombAPI.getLatestPPV(token, point.id);
                            
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
                }
            }
        } catch (err) {
            console.error('Error al refrescar:', err);
        }
        setLoading(false);
    };

    // Cargar detalles de punto con API real
    const loadPointDetails = async (point) => {
        setSelectedPoint(point);
        setLoading(true);
        
        try {
            if (useRealAPI && window.HoneycombAPI && token) {
                const result = await window.HoneycombAPI.getPeakRecords(token, point.id, 20);
                
                if (result.ok && result.records) {
                    const parsedRecords = window.HoneycombAPI.parseTriaxialData(result.records);
                    setPeakRecords(parsedRecords);
                }
            } else {
                setPeakRecords(mockPeakRecords);
            }
        } catch (err) {
            console.error('Error al cargar detalles:', err);
            setPeakRecords(mockPeakRecords);
        }
        
        setLoading(false);
        setCurrentScreen('details');
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
    };

    // Componente de Login
    const LoginScreen = () => (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="bg-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="activity" className="text-white" style={{width: '40px', height: '40px'}}></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">Honeycomb</h1>
                    <p className="text-gray-500 mt-2">Monitor Omnidots SWARM</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                        <i data-lucide="alert-circle" style={{width: '20px', height: '20px'}}></i>
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="demo@ejemplo.cl"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
                    >
                        {loading ? 'Conectando...' : 'Iniciar Sesión'}
                    </button>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="text-blue-800 font-semibold mb-1">💡 Demo Mode</p>
                        <p className="text-blue-700">Ingresa cualquier usuario y contraseña para ver la demo</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Componente de Dashboard
    const DashboardScreen = () => (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-blue-500 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Puntos de Medición</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={refreshData}
                            className="p-2 hover:bg-blue-600 rounded-lg transition"
                            disabled={loading}
                        >
                            <i data-lucide="refresh-cw" className={loading ? 'animate-spin' : ''} style={{width: '24px', height: '24px'}}></i>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-red-500 rounded-lg transition"
                            title="Cerrar sesión"
                        >
                            <i data-lucide="log-out" style={{width: '24px', height: '24px'}}></i>
                        </button>
                    </div>
                </div>
                <p className="text-blue-100 text-sm">
                    {measuringPoints.filter(p => p.active).length} puntos activos | Última: {lastUpdate.toLocaleTimeString('es-CL')}
                    {useRealAPI && ' | 🔌 API Real Conectada'}
                </p>
            </div>

            <div className="p-4 space-y-3">
                {measuringPoints.map(point => (
                    <div
                        key={point.id}
                        onClick={() => loadPointDetails(point)}
                        className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 text-lg mb-1">{point.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <i data-lucide="map-pin" style={{width: '14px', height: '14px'}}></i>
                                    <span>{point.sensor.serial}</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                point.alarm_level === 'normal' ? 'bg-green-100 text-green-700' :
                                point.alarm_level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {point.alarm_level === 'normal' ? 'NORMAL' :
                                 point.alarm_level === 'warning' ? 'ADVERTENCIA' : 'ALERTA'}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center bg-blue-50 rounded-lg py-2">
                                <div className="text-2xl font-bold text-blue-600">{point.last_ppv}</div>
                                <div className="text-xs text-gray-500">PPV (mm/s)</div>
                                <div className="text-xs text-green-600 mt-1">● EN VIVO</div>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                                <i data-lucide="battery" className={point.sensor.battery_level < 50 ? 'text-red-500' : 'text-green-500'} style={{width: '16px', height: '16px'}}></i>
                                <span className="text-sm font-semibold">{Math.round(point.sensor.battery_level)}%</span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                                <i data-lucide="wifi" className="text-green-500" style={{width: '16px', height: '16px'}}></i>
                                <span className="text-sm font-semibold">{point.sensor.signal_strength}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                            <span>{point.category} | {point.guide_line}</span>
                            <span className="flex items-center gap-1">
                                <i data-lucide="activity" style={{width: '12px', height: '12px'}}></i>
                                {point.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // Componente de Detalles
    const DetailsScreen = () => (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-blue-500 text-white p-4 shadow-lg">
                <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className="text-white mb-3 hover:underline"
                >
                    ← Volver
                </button>
                <h1 className="text-xl font-bold mb-1">{selectedPoint?.name}</h1>
                <p className="text-blue-100 text-sm">{selectedPoint?.sensor.serial}</p>
            </div>

            <div className="p-4">
                <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <i data-lucide="trending-up" className="text-blue-500" style={{width: '20px', height: '20px'}}></i>
                        Registros Recientes PPV por Eje
                    </h2>

                    <div className="space-y-3">
                        {peakRecords.map((record, idx) => (
                            <div key={idx} className="border-b last:border-0 pb-3 last:pb-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-gray-800">{record.time}</div>
                                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        Máximo: {record.max_axis} • {record.dominant_freq} Hz
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-red-50 rounded-lg p-2 border-l-4 border-red-500">
                                        <div className="text-xs text-red-600 font-semibold mb-1">EJE X</div>
                                        <div className="text-lg font-bold text-red-700">{record.ppv_x}</div>
                                        <div className="text-xs text-gray-500">mm/s</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <i data-lucide="waves" className="text-red-400" style={{width: '10px', height: '10px'}}></i>
                                            <span className="text-xs text-red-600">{record.freq_x} Hz</span>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-lg p-2 border-l-4 border-green-500">
                                        <div className="text-xs text-green-600 font-semibold mb-1">EJE Y</div>
                                        <div className="text-lg font-bold text-green-700">{record.ppv_y}</div>
                                        <div className="text-xs text-gray-500">mm/s</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <i data-lucide="waves" className="text-green-400" style={{width: '10px', height: '10px'}}></i>
                                            <span className="text-xs text-green-600">{record.freq_y} Hz</span>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-2 border-l-4 border-blue-500">
                                        <div className="text-xs text-blue-600 font-semibold mb-1">EJE Z</div>
                                        <div className="text-lg font-bold text-blue-700">{record.ppv_z}</div>
                                        <div className="text-xs text-gray-500">mm/s</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <i data-lucide="waves" className="text-blue-400" style={{width: '10px', height: '10px'}}></i>
                                            <span className="text-xs text-blue-600">{record.freq_z} Hz</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Render principal
    return (
        <div className="w-full min-h-screen">
            {currentScreen === 'login' && <LoginScreen />}
            {currentScreen === 'dashboard' && <DashboardScreen />}
            {currentScreen === 'details' && <DetailsScreen />}
        </div>
    );
};

// Renderizar aplicación
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HoneycombApp />);

// Inicializar iconos Lucide
setTimeout(() => {
    if (window.lucide) {
        lucide.createIcons();
    }
}, 100);