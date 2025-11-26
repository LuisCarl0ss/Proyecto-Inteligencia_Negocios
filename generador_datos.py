import pandas as pd
import random
from faker import Faker
import json
from datetime import datetime, timedelta

# Inicializar Faker (Generador de datos falsos realistas)
fake = Faker("es_MX")  # Configurado para México

# Configuración
NUM_PROYECTOS = 500  # Generaremos 500 proyectos históricos
FILENAME_SQL = "poblado_datos.sql"
FILENAME_JSON = "data.json"

print(f"Generando {NUM_PROYECTOS} proyectos con datos sintéticos...")

# ==========================================
# 1. GENERACIÓN DE DIMENSIONES (Catálogos)
# ==========================================

# --- A) Dimensión Tecnología ---
tecnologias = [
    (1, "Python / Django", "PostgreSQL", "AWS"),
    (2, "React / Node.js", "MongoDB", "AWS"),
    (3, ".NET Core / Angular", "SQL Server", "Azure"),
    (4, "Java Spring", "Oracle", "Google Cloud"),
    (5, "PHP / Laravel", "MySQL", "DigitalOcean"),
    (6, "Data Science Stack", "BigQuery", "Google Cloud"),
]

# --- B) Dimensión Estado ---
estados = [
    (1, "Completado", "Éxito rotundo"),
    (2, "Completado", "Con sobrecostos"),
    (3, "Completado", "Con retrasos"),
    (4, "Cancelado", "Falta de presupuesto"),
    (5, "Cancelado", "Cambio de estrategia"),
    (6, "Retrasado", "Problemas técnicos"),
]

# --- C) Dimensión Clientes (Generamos 20 empresas) ---
clientes = []
industrias = ["Fintech", "Salud", "Retail", "Manufactura", "Educación", "Logística"]
for i in range(1, 21):
    clientes.append(
        {
            "ClienteID": i,
            "NombreEmpresa": fake.company(),
            "Industria": random.choice(industrias),
            "Pais": "México",  # Simplificado para el dashboard
            "TamanioEmpresa": random.choice(
                ["Startup", "Pyme", "Corporativo", "Unicornio"]
            ),
        }
    )

# --- D) Dimensión Empleados (Generamos 15 PMs) ---
empleados = []
roles = ["Project Manager", "Tech Lead", "Scrum Master"]
for i in range(1, 16):
    empleados.append(
        {
            "EmpleadoID": i,
            "NombreCompleto": fake.name(),
            "Rol": random.choice(roles),
            "NivelSeniority": random.choice(["Senior", "Mid", "Lead"]),
            "Certificaciones": random.choice(
                ["PMP", "Scrum Master", "AWS Arch", "Ninguna"]
            ),
        }
    )

# --- E) Dimensión Tiempo (Generamos meses desde 2020 a 2024) ---
# Generamos una lista de YYYYMM
fechas = []
start_date = datetime(2020, 1, 1)
end_date = datetime(2024, 12, 1)
current_date = start_date

mapa_tiempo = {}  # Para buscar rápido

while current_date <= end_date:
    key = int(current_date.strftime("%Y%m"))  # Ej: 202001
    trimestre = (current_date.month - 1) // 3 + 1

    obj_tiempo = {
        "TiempoKey": key,
        "Anio": current_date.year,
        "Mes": current_date.month,
        "NombreMes": current_date.strftime("%B"),  # Nombre del mes
        "Trimestre": trimestre,
    }
    fechas.append(obj_tiempo)
    mapa_tiempo[key] = obj_tiempo

    # Sumar un mes
    next_month = current_date.replace(day=28) + timedelta(days=4)
    current_date = next_month - timedelta(days=next_month.day - 1)

# ==========================================
# 2. GENERACIÓN DE HECHOS (La simulación)
# ==========================================
facts_data = []
web_data = []  # Esta lista será para el JSON (Datos ya cruzados/join)

for _ in range(NUM_PROYECTOS):
    # Selecciones aleatorias de dimensiones
    cli = random.choice(clientes)
    tec = random.choice(tecnologias)  # Tupla (id, stack, bd, cloud)
    emp = random.choice(empleados)
    est = random.choice(estados)  # Tupla (id, estado, motivo)
    tiempo = random.choice(fechas)

    # --- Lógica de Negocio Sintética ---

    # 1. Presupuesto base según tamaño de empresa
    base_budget = 50000 if cli["TamanioEmpresa"] == "Startup" else 500000
    presupuesto = round(random.uniform(base_budget * 0.8, base_budget * 3), 2)

    # 2. Costo Real y Horas (Depende del estado)
    horas_estimadas = int(presupuesto / 500)  # Supuesto $500/hr promedio

    if est[1] == "Cancelado":
        costo_real = presupuesto * random.uniform(
            0.1, 0.4
        )  # Se gastó poco antes de cancelar
        horas_reales = int(horas_estimadas * random.uniform(0.1, 0.4))
        ingresos = 0
        nps = 0
    elif est[1] == "Retrasado" or est[2] == "Con sobrecostos":
        costo_real = presupuesto * random.uniform(1.1, 1.5)  # Se pasaron
        horas_reales = int(horas_estimadas * random.uniform(1.1, 1.4))
        ingresos = presupuesto  # Cobraron lo pactado, perdieron margen
        nps = random.randint(1, 6)  # Cliente enojado
    else:  # Completado Exitoso
        costo_real = presupuesto * random.uniform(0.7, 0.95)  # Ahorraron
        horas_reales = int(horas_estimadas * random.uniform(0.8, 1.0))
        ingresos = presupuesto * random.uniform(1.2, 1.5)  # Ganancia extra por bonos
        nps = random.randint(7, 10)  # Cliente feliz

    # 3. Defectos (Python tiene menos bugs que Java en esta simulación)
    factor_tec = 0.5 if "Python" in tec[1] else 1.2
    cantidad_defectos = int(random.randint(5, 50) * factor_tec)
    defectos_criticos = int(cantidad_defectos * random.uniform(0.05, 0.2))
    score_calidad = 100 - (cantidad_defectos * 2)
    if score_calidad < 0:
        score_calidad = 0

    desviacion_horas = horas_reales - horas_estimadas
    roi = 0
    if costo_real > 0:
        roi = round(((ingresos - costo_real) / costo_real) * 100, 2)

    # Guardar para SQL (IDs)
    facts_data.append(
        {
            "TiempoKey": tiempo["TiempoKey"],
            "ClienteID": cli["ClienteID"],
            "TecnologiaID": tec[0],
            "EmpleadoID": emp["EmpleadoID"],
            "EstadoID": est[0],
            "PresupuestoEstimado": presupuesto,
            "CostoReal": round(costo_real, 2),
            "IngresosFacturados": round(ingresos, 2),
            "ROI_Porcentaje": roi,
            "HorasEstimadas": horas_estimadas,
            "HorasReales": horas_reales,
            "DesviacionHoras": desviacion_horas,
            "CantidadDefectos": cantidad_defectos,
            "DefectosCriticos": defectos_criticos,
            "ScoreCalidadCodigo": score_calidad,
            "NPS_Cliente": nps,
        }
    )

    # Guardar para WEB JSON (Texto plano para no hacer JOINS en JS)
    web_data.append(
        {
            "Anio": tiempo["Anio"],
            "Mes": tiempo["NombreMes"],
            "Cliente": cli["NombreEmpresa"],
            "Industria": cli["Industria"],
            "Stack": tec[1],
            "Cloud": tec[3],
            "PM": emp["NombreCompleto"],
            "Estado": est[1],
            "Presupuesto": presupuesto,
            "Costo": round(costo_real, 2),
            "Ingresos": round(ingresos, 2),
            "ROI": roi,
            "Defectos": cantidad_defectos,
            "NPS": nps,
        }
    )

# ==========================================
# 3. EXPORTAR A SQL
# ==========================================
with open(FILENAME_SQL, "w", encoding="utf-8") as f:
    f.write("USE SoftIntel_BI_Web;\nGO\n\n")
    f.write("-- Poblado de Dimensiones --\n")

    # Tecnologías
    f.write("DELETE FROM Fact_Proyectos_Metricas;\nDELETE FROM Dim_Tecnologia;\n")
    for t in tecnologias:
        f.write(
            f"INSERT INTO Dim_Tecnologia VALUES ({t[0]}, '{t[1]}', '{t[2]}', '{t[3]}');\n"
        )

    # Estados
    f.write("DELETE FROM Dim_Estado;\n")
    for e in estados:
        f.write(f"INSERT INTO Dim_Estado VALUES ({e[0]}, '{e[1]}', '{e[2]}');\n")

    # Clientes
    f.write("DELETE FROM Dim_Cliente;\n")
    for c in clientes:
        f.write(
            f"INSERT INTO Dim_Cliente VALUES ({c['ClienteID']}, '{c['NombreEmpresa']}', '{c['Industria']}', '{c['Pais']}', '{c['TamanioEmpresa']}');\n"
        )

    # Empleados
    f.write("DELETE FROM Dim_Empleado;\n")
    for e in empleados:
        f.write(
            f"INSERT INTO Dim_Empleado VALUES ({e['EmpleadoID']}, '{e['NombreCompleto']}', '{e['Rol']}', '{e['NivelSeniority']}', '{e['Certificaciones']}');\n"
        )

    # Tiempo
    f.write("DELETE FROM Dim_Tiempo;\n")
    for t in fechas:
        f.write(
            f"INSERT INTO Dim_Tiempo VALUES ({t['TiempoKey']}, {t['Anio']}, {t['Mes']}, '{t['NombreMes']}', {t['Trimestre']});\n"
        )

    f.write("\n-- Poblado de Hechos --\n")
    for fact in facts_data:
        vals = f"{fact['TiempoKey']}, {fact['ClienteID']}, {fact['TecnologiaID']}, {fact['EmpleadoID']}, {fact['EstadoID']}, {fact['PresupuestoEstimado']}, {fact['CostoReal']}, {fact['IngresosFacturados']}, {fact['ROI_Porcentaje']}, {fact['HorasEstimadas']}, {fact['HorasReales']}, {fact['DesviacionHoras']}, {fact['CantidadDefectos']}, {fact['DefectosCriticos']}, {fact['ScoreCalidadCodigo']}, {fact['NPS_Cliente']}"
        f.write(f"INSERT INTO Fact_Proyectos_Metricas VALUES ({vals});\n")

print(f"Archivo SQL generado: {FILENAME_SQL}")

# ==========================================
# 4. EXPORTAR A JSON (Para la Web)
# ==========================================
with open(FILENAME_JSON, "w", encoding="utf-8") as f:
    json.dump(web_data, f, ensure_ascii=False, indent=4)

print(f"Archivo JSON generado: {FILENAME_JSON}")
print("¡Proceso completado!")
