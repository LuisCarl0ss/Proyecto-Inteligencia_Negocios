// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
let datosGlobales = [];
let chartTecnologia = null;
let chartEstado = null;
let chartCubo = null;
let chartRayleigh = null;

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM Cargado. Iniciando aplicación...");
    
    // 1. Cargar Datos
    cargarDatos();

    // 2. Activar Botón Hamburguesa (Si existe)
    const menuToggle = document.getElementById("menu-toggle");
    const wrapper = document.getElementById("wrapper");
    if (menuToggle && wrapper) {
        menuToggle.addEventListener("click", function(e) {
            e.preventDefault();
            wrapper.classList.toggle("toggled");
        });
    }
});

// ==========================================
// 2. CARGA DE DATOS (ROUTER INTELIGENTE)
// ==========================================
async function cargarDatos() {
    try {
        const respuesta = await fetch('./data.json');
        if (!respuesta.ok) throw new Error("Error HTTP: " + respuesta.status);
        
        datosGlobales = await respuesta.json();
        console.log("Datos cargados: " + datosGlobales.length + " registros.");

        // --- ROUTER: Detectamos en qué página estamos ---
        
        if (document.getElementById('kpiIngresos')) {
            console.log("Página detectada: DASHBOARD");
            actualizarDashboard();
        } 
        else if (document.getElementById('graficaOlap')) {
            console.log("Página detectada: CUBO OLAP");
            configurarEventosCubo(); // Configuramos los selects
            actualizarCubo();
        } 
        else if (document.getElementById('graficaRayleigh')) {
            console.log("Página detectada: ESTRATEGIA");
            actualizarEstrategia();
        }

    } catch (error) {
        console.error("Error crítico:", error);
        alert("Error cargando datos. Revisa la consola (F12).");
    }
}

// ==========================================
// 3. LÓGICA: DASHBOARD GENERAL
// ==========================================
function actualizarDashboard() {
    const anioSeleccionado = document.getElementById("filtroAnio").value;
    let datosFiltrados = datosGlobales;
    
    if (anioSeleccionado !== "todos") {
        datosFiltrados = datosGlobales.filter(d => d.Anio == anioSeleccionado);
    }
    calcularKPIs(datosFiltrados);
    renderizarGraficas(datosFiltrados);
}

function calcularKPIs(datos) {
    const totalIngresos = datos.reduce((sum, item) => sum + item.Ingresos, 0);
    const promedioROI = datos.length > 0 ? datos.reduce((sum, item) => sum + item.ROI, 0) / datos.length : 0;
    const totalDefectos = datos.reduce((sum, item) => sum + item.Defectos, 0);

    const formatoDinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const formatoNumero = new Intl.NumberFormat('en-US');

    document.getElementById('kpiIngresos').innerText = formatoDinero.format(totalIngresos);
    document.getElementById('kpiRoi').innerText = promedioROI.toFixed(1) + "%";
    document.getElementById('kpiProyectos').innerText = datos.length;
    document.getElementById('kpiDefectos').innerText = formatoNumero.format(totalDefectos);
}

function renderizarGraficas(datos) {
    // Procesamiento
    const ingresosPorStack = {};
    const conteoEstados = {};
    datos.forEach(d => {
        if (!ingresosPorStack[d.Stack]) ingresosPorStack[d.Stack] = 0;
        ingresosPorStack[d.Stack] += d.Ingresos;
        if (!conteoEstados[d.Estado]) conteoEstados[d.Estado] = 0;
        conteoEstados[d.Estado] += 1;
    });

    // Ordenar Barras
    const arrayTec = Object.entries(ingresosPorStack).sort((a, b) => b[1] - a[1]);
    const labelsTec = arrayTec.map(x => x[0]);
    const dataTec = arrayTec.map(x => x[1]);

    // Configuración ChartJS
    Chart.defaults.color = '#888'; 
    Chart.defaults.borderColor = '#2a2a2a';

    // Gráfica Barras
    const ctxTec = document.getElementById('graficaTecnologia').getContext('2d');
    if (chartTecnologia) chartTecnologia.destroy();
    chartTecnologia = new Chart(ctxTec, {
        type: 'bar',
        data: {
            labels: labelsTec,
            datasets: [{
                label: 'Ingresos',
                data: dataTec,
                backgroundColor: '#e63946',
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#2a2a2a' }, ticks: { callback: v => '$' + v/1000000 + 'M' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Gráfica Dona
    const ctxEst = document.getElementById('graficaEstado').getContext('2d');
    if (chartEstado) chartEstado.destroy();
    chartEstado = new Chart(ctxEst, {
        type: 'doughnut',
        data: {
            labels: Object.keys(conteoEstados),
            datasets: [{
                data: Object.values(conteoEstados),
                backgroundColor: ['#e63946', '#a8dadc', '#457b9d', '#1d3557', '#333'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } }
        }
    });
}

// ==========================================
// 4. LÓGICA: CUBO OLAP
// ==========================================
function configurarEventosCubo() {
    if (document.getElementById('selDimension')) {
        document.getElementById('selDimension').addEventListener('change', actualizarCubo);
        document.getElementById('selMetrica').addEventListener('change', actualizarCubo);
    }
}

function actualizarCubo() {
    if (!datosGlobales.length) return;

    const dim = document.getElementById('selDimension').value;
    const met = document.getElementById('selMetrica').value;
    
    // Agrupar
    const agrupado = {};
    datosGlobales.forEach(d => {
        const key = d[dim];
        if (!agrupado[key]) agrupado[key] = 0;
        
        if (met === 'ROI') {
            if (!Array.isArray(agrupado[key])) agrupado[key] = [];
            agrupado[key].push(d[met]);
        } else {
            agrupado[key] += d[met];
        }
    });

    if (met === 'ROI') {
        Object.keys(agrupado).forEach(k => {
            const sum = agrupado[k].reduce((a, b) => a + b, 0);
            agrupado[k] = sum / agrupado[k].length;
        });
    }

    // Top 15
    const sortedArray = Object.entries(agrupado).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const labels = sortedArray.map(x => x[0]);
    const data = sortedArray.map(x => x[1]);

    // Renderizar
    const ctx = document.getElementById('graficaOlap').getContext('2d');
    if (chartCubo) chartCubo.destroy();
    
    let color = '#e63946';
    if (met === 'Defectos') color = '#f4a261';
    if (met === 'ROI') color = '#2a9d8f';

    chartCubo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: met,
                data: data,
                backgroundColor: color,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: '#2a2a2a' } }, y: { grid: { display: false } } }
        }
    });
    
    document.getElementById('tituloGrafica').innerText = `Análisis de ${met} por ${dim}`;
    
    // Tabla
    const tbody = document.getElementById('tablaBody');
    tbody.innerHTML = '';
    const fmtMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const fmtNum = new Intl.NumberFormat('en-US');

    sortedArray.forEach(item => {
        let val = item[1];
        if (['Ingresos', 'Costo', 'Presupuesto'].includes(met)) val = fmtMoney.format(val);
        else if (met === 'ROI') val = val.toFixed(2) + '%';
        else val = fmtNum.format(val);

        tbody.innerHTML += `<tr><td>${item[0]}</td><td class="text-end fw-bold text-white">${val}</td></tr>`;
    });
}

// ==========================================
// 5. LÓGICA: ESTRATEGIA & IA (BSC + Rayleigh)
// ==========================================
function actualizarEstrategia() {
    console.log("Calculando métricas BSC...");

    // 1. Calcular BSC
    const totalROI = datosGlobales.reduce((sum, d) => sum + d.ROI, 0);
    const avgROI = (totalROI / datosGlobales.length).toFixed(1);
    
    const totalNPS = datosGlobales.reduce((sum, d) => sum + d.NPS, 0);
    const avgNPS = (totalNPS / datosGlobales.length).toFixed(1);

    const totalDef = datosGlobales.reduce((sum, d) => sum + d.Defectos, 0);
    const avgDef = Math.round(totalDef / datosGlobales.length);

    console.log("ROI:", avgROI, "NPS:", avgNPS, "Defectos:", avgDef);

    // 2. Pintar en HTML
    document.getElementById('bscFinanciero').innerText = avgROI + "%";
    document.getElementById('bscCliente').innerText = avgNPS;
    document.getElementById('bscProcesos').innerText = avgDef;

    // 3. Colores Dinámicos (Semáforo)
    const cardFin = document.getElementById('bscFinanciero');
    if(avgROI > 15) cardFin.className = "fw-bold text-success"; // Verde
    else if(avgROI > 0) cardFin.className = "fw-bold text-warning"; // Amarillo
    else cardFin.className = "fw-bold text-danger"; // Rojo

    const tbody = document.getElementById('tablaRiesgos');
    if (tbody) {
        tbody.innerHTML = '';
        
        // Filtramos proyectos con ROI negativo y los ordenamos del peor al "menos peor"
        const proyectosCriticos = datosGlobales
            .filter(d => d.ROI < 0)
            .sort((a, b) => a.ROI - b.ROI) // Orden ascendente (los más negativos primero)
            .slice(0, 5); // Top 5

        proyectosCriticos.forEach(p => {
            const row = `
                <tr>
                    <td>
                        <div class="fw-bold text-white">${p.Cliente}</div>
                        <small class="text-muted">${p.Stack}</small>
                    </td>
                    <td class="text-center text-danger fw-bold">${p.ROI}%</td>
                    <td class="text-center">
                        <span class="badge bg-danger bg-opacity-25 text-danger border border-danger p-1">
                            ${p.Estado}
                        </span>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // 4. Iniciar Simulación por defecto
    simularRayleigh();
}

function simularRayleigh() {
    const duracion = parseInt(document.getElementById('inputDuracion').value) || 12;
    const totalDefectos = parseInt(document.getElementById('inputDefectos').value) || 100;
    const sigma = duracion * 0.4; 

    const labels = [];
    const data = [];

    for (let t = 0; t <= duracion; t++) {
        labels.push("Mes " + t);
        const exponente = - (Math.pow(t, 2)) / (2 * Math.pow(sigma, 2));
        const probabilidad = (t / Math.pow(sigma, 2)) * Math.exp(exponente);
        data.push(totalDefectos * probabilidad);
    }

    const ctx = document.getElementById('graficaRayleigh').getContext('2d');
    if (chartRayleigh) chartRayleigh.destroy();

    chartRayleigh = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Proyección de Defectos',
                data: data,
                borderColor: '#e63946',
                backgroundColor: 'rgba(230, 57, 70, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2a2a2a' } },
                x: { grid: { display: false } }
            }
        }
    });

    const picoMes = Math.floor(sigma);
    document.getElementById('textoConclusion').innerText = 
        `💡 Análisis: Según el modelo, el momento más crítico será el Mes ${picoMes} (Pico de la curva). Se sugiere asignar QAs Senior en esa fecha.`;
}

// ==========================================
// 6. UTILIDADES
// ==========================================
function toggleMenu() {
    const wrapper = document.getElementById("wrapper");
    if (wrapper) wrapper.classList.toggle("toggled");
}