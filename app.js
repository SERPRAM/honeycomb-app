const { useState, useEffect } = React;

// ==================== COMPONENTE LOGIN SEPARADO ====================
const LoginForm = ({ onLogin, onDemoMode, initialError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(initialError || '');

    const handleSubmit = async () => {
        if (!username || !password) {
            setError('Por favor ingresa usuario y contraseña');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const result = await window.HoneycombAPI.authenticate(username, password);
            
            if (result.ok && result.token) {
                onLogin(result.token, username);
            } else {
                setError(result.message || 'Credenciales inválidas');
            }
        } catch (err) {
            console.error('Error login:', err);
            setError('Error de conexión con Honeycomb');
        }
        
        setLoading(false);
    };

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
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Usuario Honeycomb</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="tu-usuario"
                            autoComplete="username"
                            autoCapitalize="off"
                            autoCorrect="off"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="********"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Conectando...' : 'Iniciar Sesión'}
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
                        onClick={onDemoMode}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                        Entrar en Modo Demo
                    </button>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-4">
                        <p className="text-blue-700">Usa tus credenciales de <strong>honeycomb.omnidots.com</strong></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== COMPONENTE PRINCIPAL ====================
const HoneycombApp = () => {
    const [currentScreen, setCurrentScreen] = useState('login');
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [measuringPoints, setMeasuringPoints] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [peakRecords, setPeakRecords] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [useRealAPI, setUseRealAPI] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [timeRange, setTimeRange] = useState(24);

    const mockMeasuringPoints = [
        { id: 1, name: 'Demo - Sensor 1', active: true, category: 'CAT2', guide_line: 'DS_38_2011', sensor: { serial: 'DEMO-001', battery_level: 78, signal_strength: -62 }, last_ppv: 4.8, alarm_level: 'normal' },
        { id: 2, name: 'Demo - Sensor 2', active: true, category: 'CAT1', guide_line: 'DS_38_2011', sensor: { serial: 'DEMO-002', battery_level: 45, signal_strength: -75 }, last_ppv: 9.3, alarm_level: 'warning' }
    ];

    const mockPeakRecords = [
        { time: '14:23:18', date: '16-01-2026', ppv_x: 1.8, ppv_y: 2.1, ppv_z: 4.8, freq_x: 12, freq_y: 15, freq_z: 18, max_axis: 'Z', dominant_freq: 18 },
        { time: '14:28:45', date: '16-01-2026', ppv_x: 2.3, ppv_y: 3.2, ppv_z: 3.9, freq_x: 16, freq_y: 19, freq_z: 17, max_axis: 'Z', dominant_freq: 17 }
    ];

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

    useEffect(() => {
        let interval;
        if (autoRefresh && currentScreen === 'dashboard' && token) {
            interval = setInterval(() => refreshData(), 30000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, currentScreen, token]);

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
                        
                        return { ...point, last_ppv: parseFloat(last_ppv.toFixed(2)), alarm_level };
                    })
                );
                
                setMeasuringPoints(pointsWithPPV);
                setCurrentScreen('dashboard');
                setConnectionStatus('connected');
                setLastUpdate(new Date());
            } else {
                setConnectionStatus('error');
            }
        } catch (err) {
            console.error('Error cargando datos:', err);
            setConnectionStatus('error');
        }
        setLoading(false);
    };

    const handleLoginSuccess = (newToken, user) => {
        setToken(newToken);
        setUsername(user);
        setUseRealAPI(true);
        loadInitialData();
    };

    const handleDemoMode = () => {
        setUseRealAPI(false);
        setMeasuringPoints(mockMeasuringPoints);
        setCurrentScreen('dashboard');
        setConnectionStatus('demo');
        setLastUpdate(new Date());
    };

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
                        
                        return { ...point, last_ppv: parseFloat(last_ppv.toFixed(2)), alarm_level };
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

    const loadPointDetails = async (point, hours = timeRange) => {
        setSelectedPoint(point);
        setCurrentScreen('details');
        setLoading(true);
        
        try {
            if (useRealAPI && window.HoneycombAPI) {
                const endTime = new Date();
                const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
                
                const result = await window.HoneycombAPI.getPeakRecordsRange(point.id, startTime, endTime, 100);
                
                if (result.ok && result.records && result.records.length > 0) {
                    const parsedRecords = window.HoneycombAPI.parseTriaxialData(result.records);
                    setPeakRecords(parsedRecords);
                } else {
                    setPeakRecords([]);
                }
            } else {
                setPeakRecords(mockPeakRecords);
            }
        } catch (err) {
            console.error('Error al cargar detalles:', err);
            setPeakRecords([]);
        }
        
        setLoading(false);
    };

    const refreshDetails = async (hours) => {
        setTimeRange(hours);
        if (selectedPoint) {
            await loadPointDetails(selectedPoint, hours);
        }
    };

    const handleLogout = () => {
        if (window.HoneycombAPI) window.HoneycombAPI.logout();
        setToken('');
        setUsername('');
        setMeasuringPoints([]);
        setCurrentScreen('login');
        setConnectionStatus('disconnected');
        setUseRealAPI(true);
    };

    if (currentScreen === 'login') {
        return <LoginForm onLogin={handleLoginSuccess} onDemoMode={handleDemoMode} />;
    }

    if (currentScreen === 'dashboard') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-500 text-white p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-xl font-bold">Puntos de Medición</h1>
                        <div className="flex gap-2">
                            <button onClick={() => setAutoRefresh(!autoRefresh)} className="p-2 rounded-lg bg-blue-600">
                                {autoRefresh ? '⏸️' : '▶️'}
                            </button>
                            <button onClick={refreshData} className="p-2 rounded-lg hover:bg-blue-600">🔄</button>
                            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500">🚪</button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-blue-100 text-sm">
                        <span>{measuringPoints.filter(p => p.active).length} activos | {lastUpdate.toLocaleTimeString('es-CL')}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'demo' ? 'bg-yellow-500 text-black' : 'bg-red-500'}`}>
                            {connectionStatus === 'connected' ? '🔌 Conectado' : connectionStatus === 'demo' ? '🎮 Demo' : '❌ Error'}
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {measuringPoints.map(point => (
                        <div key={point.id} onClick={() => loadPointDetails(point)} className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">{point.name}</h3>
                                    <p className="text-sm text-gray-500">📡 {point.sensor?.serial || 'Sin sensor'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${point.alarm_level === 'normal' ? 'bg-green-100 text-green-700' : point.alarm_level === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {point.alarm_level === 'normal' ? '✓ OK' : point.alarm_level === 'warning' ? '⚠️' : '🚨'}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center bg-blue-50 rounded-lg py-2">
                                    <div className="text-2xl font-bold text-blue-600">{point.last_ppv}</div>
                                    <div className="text-xs text-gray-500">PPV mm/s</div>
                                </div>
                                <div className="text-center"><div className="font-semibold">🔋{Math.round(point.sensor?.battery_level || 0)}%</div><div className="text-xs text-gray-400">Batería</div></div>
                                <div className="text-center"><div className="font-semibold">📶{point.sensor?.signal_strength || 'N/A'}</div><div className="text-xs text-gray-400">Señal</div></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (currentScreen === 'details') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-500 text-white p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setCurrentScreen('dashboard')} className="hover:underline">← Volver</button>
                        <button onClick={() => refreshDetails(timeRange)} disabled={loading} className="p-2 rounded-lg hover:bg-blue-600">{loading ? '⏳' : '🔄'}</button>
                    </div>
                    <h1 className="text-xl font-bold mt-2">{selectedPoint?.name}</h1>
                    <p className="text-blue-100 text-sm">📡 {selectedPoint?.sensor?.serial || 'Sin sensor'}</p>
                </div>

                <div className="p-4">
                    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div><div className="text-2xl font-bold text-blue-600">{selectedPoint?.last_ppv || 0}</div><div className="text-xs text-gray-500">Último PPV</div></div>
                            <div><div className="text-2xl font-bold text-gray-700">{selectedPoint?.category || 'N/A'}</div><div className="text-xs text-gray-500">Categoría</div></div>
                            <div><div className={`text-2xl font-bold ${selectedPoint?.alarm_level === 'normal' ? 'text-green-600' : selectedPoint?.alarm_level === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>{selectedPoint?.alarm_level === 'normal' ? '✓' : selectedPoint?.alarm_level === 'warning' ? '⚠️' : '🚨'}</div><div className="text-xs text-gray-500">Estado</div></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                        <h3 className="font-semibold text-gray-700 mb-3">⏱️ Rango de tiempo</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {[{h:1,l:'1h'},{h:6,l:'6h'},{h:24,l:'24h'},{h:168,l:'7d'}].map(({h,l}) => (
                                <button key={h} onClick={() => refreshDetails(h)} disabled={loading} className={`py-2 rounded-lg text-sm font-medium ${timeRange === h ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{l}</button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4">
                        <div className="flex justify-between mb-3">
                            <h2 className="font-bold text-gray-800">📈 Registros PPV</h2>
                            <span className="text-xs text-gray-500">{peakRecords.length} registros</span>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">⏳ Cargando...</div>
                        ) : peakRecords.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">📭 Sin registros en este período</div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {peakRecords.map((r, i) => (
                                    <div key={i} className="border-b last:border-0 pb-3">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-semibold"><span className="text-blue-600">{r.date}</span> | {r.time}</span>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Máx:{r.max_axis} {r.dominant_freq}Hz</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-red-50 p-2 rounded border-l-4 border-red-500"><div className="text-xs text-red-600 font-semibold">X</div><div className="text-lg font-bold text-red-700">{r.ppv_x?.toFixed(2)}</div><div className="text-xs text-gray-500">{r.freq_x}Hz</div></div>
                                            <div className="bg-green-50 p-2 rounded border-l-4 border-green-500"><div className="text-xs text-green-600 font-semibold">Y</div><div className="text-lg font-bold text-green-700">{r.ppv_y?.toFixed(2)}</div><div className="text-xs text-gray-500">{r.freq_y}Hz</div></div>
                                            <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-500"><div className="text-xs text-blue-600 font-semibold">Z</div><div className="text-lg font-bold text-blue-700">{r.ppv_z?.toFixed(2)}</div><div className="text-xs text-gray-500">{r.freq_z}Hz</div></div>
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HoneycombApp />);
