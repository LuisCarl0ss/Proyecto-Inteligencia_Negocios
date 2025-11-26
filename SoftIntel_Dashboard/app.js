let datosGlobales = [];
let chartTecnologia = null;
let chartEstado = null;

// Esperamos a que todo cargue
document.addEventListener("DOMContentLoaded", function() {
    // 1. CARGAR DATOS
    cargarDatos();
    // YA NO NECESITAMOS BUSCAR EL BOTÓN AQUÍ, porque usamos onclick en el HTML
});

// --- Función de Carga ---
async function cargarDatos() {
    try {
        const respuesta = await fetch('./data.json');
        if (!respuesta.ok) throw new Error("Error HTTP: " + respuesta.status);
        datosGlobales = await respuesta.json();
        actualizarDashboard(); 
    } catch (error) {
        console.error(error);
        alert("Error cargando datos. Asegúrate de usar Live Server.");
    }
}

// --- Actualización de Dashboard ---
function actualizarDashboard() {
    const anioSeleccionado = document.getElementById("filtroAnio").value;
    
    let datosFiltrados = datosGlobales;
    if (anioSeleccionado !== "todos") {
        datosFiltrados = datosGlobales.filter(d => d.Anio == anioSeleccionado);
    }

    calcularKPIs(datosFiltrados);
    renderizarGraficas(datosFiltrados);
}

// --- KPIs ---
function calcularKPIs(datos) {
    const totalIngresos = datos.reduce((sum, item) => sum + item.Ingresos, 0);
    const promedioROI = datos.length > 0 ? datos.reduce((sum, item) => sum + item.ROI, 0) / datos.length : 0;
    const totalDefectos = datos.reduce((sum, item) => sum + item.Defectos, 0);

    const formatoDinero = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 0
    });

    const formatoNumero = new Intl.NumberFormat('en-US');

    document.getElementById('kpiIngresos').innerText = formatoDinero.format(totalIngresos);
    document.getElementById('kpiRoi').innerText = promedioROI.toFixed(1) + "%";
    document.getElementById('kpiProyectos').innerText = datos.length;
    document.getElementById('kpiDefectos').innerText = formatoNumero.format(totalDefectos);
}

// --- Gráficas ---
function renderizarGraficas(datos) {
    // ===============================================
    // 1. PROCESAMIENTO DE DATOS (Agregaciones)
    // ===============================================
    
    // A) Agrupar Ingresos por Tecnología (Stack)
    const mapaIngresos = {};
    const mapaEstados = {};

    datos.forEach(d => {
        // Sumar Ingresos por Stack
        if (!mapaIngresos[d.Stack]) mapaIngresos[d.Stack] = 0;
        mapaIngresos[d.Stack] += d.Ingresos;

        // Contar Estados
        if (!mapaEstados[d.Estado]) mapaEstados[d.Estado] = 0;
        mapaEstados[d.Estado] += 1;
    });

    // B) Ordenar las Tecnologías (De Mayor a Menor Ingreso) para que se vea ordenado
    // Convertimos el objeto a array, ordenamos y separamos de nuevo
    const arrayTecnologias = Object.entries(mapaIngresos)
        .sort((a, b) => b[1] - a[1]); // Orden descendente

    const labelsTec = arrayTecnologias.map(item => item[0]);
    const dataTec = arrayTecnologias.map(item => item[1]);

    // C) Preparar datos de Estados
    const labelsEst = Object.keys(mapaEstados);
    const dataEst = Object.values(mapaEstados);


    // ===============================================
    // 2. CONFIGURACIÓN VISUAL (Chart.js)
    // ===============================================
    
    // Configuración Global de Fuentes y Colores para Dark Mode
    Chart.defaults.color = '#a0a0a0'; 
    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.font.size = 10;
    Chart.defaults.borderColor = '#2a2a2a'; // Color de las líneas del grid

    // --- GRÁFICA 1: BARRAS (INGRESOS POR TECNOLOGÍA) ---
    const ctxTec = document.getElementById('graficaTecnologia').getContext('2d');
    
    // Destruir gráfica anterior si existe (para evitar bugs al filtrar)
    if (chartTecnologia) chartTecnologia.destroy();

    chartTecnologia = new Chart(ctxTec, {
        type: 'bar',
        data: {
            labels: labelsTec,
            datasets: [{
                label: 'Ingresos Facturados',
                data: dataTec,
                backgroundColor: '#e63946', // Rojo corporativo
                hoverBackgroundColor: '#ff4d5a', // Rojo más claro al pasar mouse
                borderRadius: 4, // Bordes redondeados en las barras
                barPercentage: 0.6, // Ancho de la barra
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, // Ocultamos leyenda porque ya es obvio
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Formato de moneda en el tooltip al pasar el mouse
                            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: { 
                    border: { display: false },
                    grid: { color: '#2a2a2a' },
                    ticks: { 
                        // Formato compacto en el eje Y ($1M, $2M)
                        callback: (val) => '$' + val/1000000 + 'M',
                        color: '#666'
                    }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#ccc' }
                }
            }
        }
    });

    // --- GRÁFICA 2: DONA (ESTADOS DEL PROYECTO) ---
    const ctxEst = document.getElementById('graficaEstado').getContext('2d');
    
    if (chartEstado) chartEstado.destroy();

    chartEstado = new Chart(ctxEst, {
        type: 'doughnut',
        data: {
            labels: labelsEst,
            datasets: [{
                data: dataEst,
                // Paleta de colores rojos/oscuros
                backgroundColor: [
                    '#e63946', // Rojo (Principal)
                    '#f1faee', // Blanco (Contraste alto)
                    '#a8dadc', // Azul claro (Acento)
                    '#457b9d', // Azul medio
                    '#1d3557'  // Azul oscuro
                ],
                borderWidth: 0, // Sin bordes blancos feos
                hoverOffset: 10 // Se expande al pasar el mouse
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // Dona delgada y elegante
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        boxWidth: 8, 
                        padding: 10,
                        font: { size: 9 }
                    } 
                }
            }
        }
    });
}

// === ESTA ES LA FUNCIÓN QUE IMPORTA ===
function toggleMenu() {
    const wrapper = document.getElementById("wrapper");
    if (wrapper) {
        wrapper.classList.toggle("toggled");
        console.log("¡Click detectado! Clase 'toggled' cambiada.");
    } else {
        console.error("ERROR CRÍTICO: No existe un div con id='wrapper' en tu HTML.");
    }
}