CREATE DATABASE SoftIntel_BI_Web;
GO
USE SoftIntel_BI_Web;
GO

-- =============================================
-- 1. CREACIÓN DE DIMENSIONES (CONTEXTO)
-- =============================================

-- Dimensión 1: Tiempo (Clásica e indispensable)
CREATE TABLE Dim_Tiempo (
    TiempoKey INT PRIMARY KEY, -- Formato YYYYMM (ej: 202401)
    Anio INT,
    Mes INT,
    NombreMes VARCHAR(20),
    Trimestre INT
);

-- Dimensión 2: Cliente (Para análisis de ganancias por industria)
CREATE TABLE Dim_Cliente (
    ClienteID INT PRIMARY KEY,
    NombreEmpresa VARCHAR(100),
    Industria VARCHAR(50), -- Ej: Fintech, Salud, Retail
    Pais VARCHAR(50),
    TamanioEmpresa VARCHAR(50) -- Ej: Startup, Corporativo
);

-- Dimensión 3: Tecnología (Para ver qué lenguaje genera más bugs)
CREATE TABLE Dim_Tecnologia (
    TecnologiaID INT PRIMARY KEY,
    StackPrincipal VARCHAR(50), -- Ej: Backend Python, Frontend React
    BaseDeDatos VARCHAR(50),    -- Ej: SQL Server, MongoDB
    CloudProvider VARCHAR(50)   -- Ej: Azure, AWS
);

-- Dimensión 4: Empleado (Project Managers)
CREATE TABLE Dim_Empleado (
    EmpleadoID INT PRIMARY KEY,
    NombreCompleto VARCHAR(100),
    Rol VARCHAR(50),
    NivelSeniority VARCHAR(20), -- Junior, Senior, Lead
    Certificaciones VARCHAR(100)
);

-- Dimensión 5: Estado del Proyecto (Para filtrar en el Dashboard)
CREATE TABLE Dim_Estado (
    EstadoID INT PRIMARY KEY,
    EstadoProyecto VARCHAR(50), -- Completado, Cancelado, Retrasado
    MotivoCierre VARCHAR(100)   -- Ej: Exito, Falta de Presupuesto, Cambio de Alcance
);

-- =============================================
-- 2. CREACIÓN DE TABLA DE HECHOS (MÉTRICAS)
-- =============================================

CREATE TABLE Fact_Proyectos_Metricas (
    FactID INT PRIMARY KEY IDENTITY(1,1),
    
    -- Llaves Foráneas (Conexiones a las dimensiones)
    TiempoKey INT FOREIGN KEY REFERENCES Dim_Tiempo(TiempoKey),
    ClienteID INT FOREIGN KEY REFERENCES Dim_Cliente(ClienteID),
    TecnologiaID INT FOREIGN KEY REFERENCES Dim_Tecnologia(TecnologiaID),
    EmpleadoID INT FOREIGN KEY REFERENCES Dim_Empleado(EmpleadoID),
    EstadoID INT FOREIGN KEY REFERENCES Dim_Estado(EstadoID),

    -- Métricas Financieras (Balanced Scorecard - Financiero)
    PresupuestoEstimado DECIMAL(15,2),
    CostoReal DECIMAL(15,2),
    IngresosFacturados DECIMAL(15,2),
    ROI_Porcentaje DECIMAL(5,2), -- (Ingresos - Costo) / Costo

    -- Métricas Operativas (DSS Operativo)
    HorasEstimadas INT,
    HorasReales INT,
    DesviacionHoras INT,
    
    -- Métricas de Calidad (Para Modelo Rayleigh y Cubo OLAP)
    CantidadDefectos INT,
    DefectosCriticos INT,
    ScoreCalidadCodigo INT, -- Del 1 al 100
    NPS_Cliente INT         -- Net Promoter Score (Satisfacción 1-10)
);
GO