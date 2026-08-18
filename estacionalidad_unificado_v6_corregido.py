#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
estacionalidad_unificado.py  (v6 - corregido)

Script unificado con:
 - Filtro interactivo de rango de años.
 - Pronóstico configurable (Holt-Winters).
 - Métricas MoM, YoY, YTD en KPI cards y tabla resumen.
 - Visualización clara de zona proyectada.

Correcciones v6:
 1) obtener_ultimo_mes_real(): ya no aplica un offset por meses_pronostico.
    Antes asumía que recibía un df con filas proyectadas ya incluidas, pero
    siempre se la llamaba con df_historico (que nunca las tiene), lo que
    hacía que las KPI cards y MoM/YoY/YTD mostraran un mes anterior al
    último real cuando se pedía pronóstico.
 2) Los gráficos de Productos y Chango_Promedio (que nunca se pronostican,
    solo Clientes y Facturacion lo hacen) ahora usan df_historico en vez de
    df_mensual, para que su eje de fechas no se estire hasta el final del
    pronóstico mostrando meses futuros vacíos.
 3) _linea_mensual() ahora fija explícitamente los límites del eje X
    (ax.set_xlim) al último dato realmente graficado. Antes, el margen
    automático de matplotlib (~5% del rango) agregaba 2-3 meses "fantasma"
    al final del eje en TODOS los gráficos (incluso los que no tienen
    ninguna relación con el pronóstico, como los cruces vs. inflación),
    lo que hacía aparecer una etiqueta de mes futuro (ej. Oct 2026) sin
    que hubiera ningún dato real ni proyectado ahí.
"""

import re
import sys
import calendar
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle

from matplotlib.colors import LinearSegmentedColormap
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.holtwinters import ExponentialSmoothing

MESES_ES = {
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
}
MESES_ABREV = [m[:3] for m in calendar.month_name if m]

BG      = '#0b0e14'
PANEL   = '#11151c'
GRID    = '#232833'
FG      = '#e8e8e8'
MUTED   = '#8a93a3'
GREEN   = '#20c997'
RED     = '#ff5d5d'
AMBER   = '#f4b942'
BLUE    = '#4fa3ff'
PURPLE  = '#c77dff'
PROJ    = '#ff6b9d'
PROJ_BG = '#ff6b9d15'


def limpiar_moneda(valor):
    if pd.isna(valor):
        return np.nan
    if isinstance(valor, (int, float, np.integer, np.floating)):
        return float(valor)
    texto = re.sub(r'[^\d,.\-]', '', str(valor).strip())
    if texto == '':
        return np.nan
    texto = texto.replace(',', '')
    try:
        return float(texto)
    except ValueError:
        return np.nan


def var_pct(actual, anterior):
    if anterior in (0, None) or pd.isna(anterior) or pd.isna(actual):
        return np.nan
    return (actual / anterior - 1) * 100


# ==========================================================================
# 0) MENÚS INTERACTIVOS
# ==========================================================================
def solicitar_filtro_anios(df: pd.DataFrame) -> tuple:
    anios_disponibles = sorted(df.index.year.unique())
    anio_min = anios_disponibles[0]
    anio_max = anios_disponibles[-1]

    print("\n" + "=" * 60)
    print("  FILTRO DE AÑOS - Seleccione el período a analizar")
    print("=" * 60)
    print(f"  Años disponibles: {anio_min} a {anio_max} ({len(anios_disponibles)} años)")
    print("-" * 60)
    print("  [1] TODOS los años")
    print("  [2] ÚLTIMOS N años")
    print("  [3] Rango específico (ej: 2023-2026)")
    print("=" * 60)

    while True:
        opcion = input("\n  Seleccione opción [1/2/3]: ").strip()

        if opcion == '1':
            print(f"  ✓ Período: {anio_min}-{anio_max}")
            return None, None

        elif opcion == '2':
            while True:
                n_str = input(f"  ¿Últimos cuántos años desde {anio_max}? ").strip()
                try:
                    n = int(n_str)
                    if n < 1:
                        print("  ⚠ Mínimo 1 año.")
                        continue
                    inicio = max(anio_min, anio_max - n + 1)
                    print(f"  ✓ Período: {inicio}-{anio_max}")
                    return inicio, anio_max
                except ValueError:
                    print("  ⚠ Número inválido.")

        elif opcion == '3':
            while True:
                rango = input(f"  Rango YYYY-YYYY (ej: {anio_min}-{anio_max}): ").strip()
                match = re.match(r'^(\d{4})-(\d{4})$', rango)
                if not match:
                    print("  ⚠ Formato: AAAA-AAAA")
                    continue
                inicio, fin = int(match.group(1)), int(match.group(2))
                if inicio > fin:
                    print("  ⚠ Año inicial > final.")
                    continue
                if inicio < anio_min or fin > anio_max:
                    print(f"  ⚠ Fuera de rango ({anio_min}-{anio_max}).")
                    continue
                print(f"  ✓ Período: {inicio}-{fin}")
                return inicio, fin
        else:
            print("  ⚠ Opción inválida.")


def solicitar_meses_pronostico() -> int:
    print("\n" + "=" * 60)
    print("  PRONÓSTICO HOLT-WINTERS")
    print("=" * 60)
    print("  [0] SIN pronóstico")
    print("  [N] Meses a pronosticar (1-24)")
    print("=" * 60)

    while True:
        respuesta = input("\n  Meses a pronosticar [0-24]: ").strip()
        try:
            n = int(respuesta)
            if n < 0 or n > 24:
                print("  ⚠ Entre 0 y 24.")
                continue
            if n == 0:
                print("  ✓ Sin pronóstico.")
            else:
                print(f"  ✓ Pronóstico: {n} meses.")
            return n
        except ValueError:
            print("  ⚠ Número inválido.")


def aplicar_filtro_anios(df: pd.DataFrame, anio_inicio: int, anio_fin: int) -> pd.DataFrame:
    if anio_inicio is None or anio_fin is None:
        return df.copy()
    filtrado = df[(df.index.year >= anio_inicio) & (df.index.year <= anio_fin)].copy()
    print(f"  → Registros: {len(df)} → {len(filtrado)}")
    print(f"  → Años: {sorted(filtrado.index.year.unique())}")
    return filtrado


# ==========================================================================
# 1) CARGA Y PREPARACIÓN
# ==========================================================================
def cargar_datos(excel_path: str) -> pd.DataFrame:
    df = pd.read_excel(excel_path, parse_dates=['Fecha'], engine='openpyxl')
    df.set_index('Fecha', inplace=True)
    df.sort_index(inplace=True)

    if 'Clientes' not in df.columns and 'Cantidad' in df.columns:
        df.rename(columns={'Cantidad': 'Clientes'}, inplace=True)
    if 'Productos' not in df.columns:
        print("⚠ No se encontró 'Productos'; chango no se calculará.")
        df['Productos'] = np.nan
    if 'Facturacion' in df.columns:
        df['Facturacion'] = df['Facturacion'].apply(limpiar_moneda)
    else:
        print("⚠ No se encontró 'Facturacion'.")
        df['Facturacion'] = np.nan

    df = df[['Clientes', 'Productos', 'Facturacion']].resample('ME').sum(min_count=1)

    df['Chango_Promedio'] = df['Productos'] / df['Clientes']
    df['Ticket_Promedio'] = df['Facturacion'] / df['Clientes']

    for col in ['Clientes', 'Productos', 'Facturacion', 'Chango_Promedio', 'Ticket_Promedio']:
        df[f'var_{col}'] = df[col].pct_change() * 100

    df['Year']  = df.index.year
    df['Month'] = df.index.month
    return df


def preparar_datos_mensuales(df: pd.DataFrame) -> pd.DataFrame:
    mensual = df[['Clientes', 'Productos', 'Facturacion']].copy()
    mensual['Chango_Promedio'] = mensual['Productos'] / mensual['Clientes']
    mensual['Ticket_Promedio'] = mensual['Facturacion'] / mensual['Clientes']

    for col in ['Clientes', 'Productos', 'Facturacion', 'Chango_Promedio', 'Ticket_Promedio']:
        mensual[f'var_{col}'] = mensual[col].pct_change() * 100

    mensual.index = mensual.index.to_period('M').to_timestamp('M')
    return mensual


# ==========================================================================
# 1c) CÁLCULO ROBUSTO: MoM, YoY, YTD
# ==========================================================================
def obtener_ultimo_mes_real(df_historico: pd.DataFrame) -> tuple:
    """
    Obtiene el índice y la fecha del último mes con datos REALES.
    IMPORTANTE: siempre se llama con df_historico (la copia tomada ANTES de
    concatenar el pronóstico), por lo que nunca contiene filas proyectadas.
    No hace falta ningún offset por meses_pronostico: alcanza con buscar el
    último registro donde TODAS las columnas base tengan valor.
    """
    for i in range(1, len(df_historico) + 1):
        idx = -i
        row = df_historico.iloc[idx]
        if pd.notna(row['Clientes']) and pd.notna(row['Productos']) and pd.notna(row['Facturacion']):
            return idx, df_historico.index[idx]
    return -1, df_historico.index[-1]


def calcular_mom(df_mensual: pd.DataFrame, col: str, ultimo_idx: int) -> float:
    """Variación Mes-over-Mes."""
    penultimo_idx = ultimo_idx - 1
    if abs(penultimo_idx) > len(df_mensual):
        return np.nan

    ultimo = df_mensual.iloc[ultimo_idx]
    penultimo = df_mensual.iloc[penultimo_idx]

    # Verificar que ambos tengan valor
    if pd.isna(ultimo[col]) or pd.isna(penultimo[col]):
        return np.nan

    return var_pct(ultimo[col], penultimo[col])


def calcular_yoy(df_mensual: pd.DataFrame, col: str, fecha_ultimo: pd.Timestamp) -> float:
    """Variación Year-over-Year: mismo mes, año anterior (por fecha exacta)."""
    anio_anterior = fecha_ultimo.year - 1
    mes_buscado = fecha_ultimo.month

    mask = (df_mensual.index.year == anio_anterior) & (df_mensual.index.month == mes_buscado)
    candidatos = df_mensual[mask]

    ultimo_valor = df_mensual.loc[fecha_ultimo, col] if fecha_ultimo in df_mensual.index else np.nan

    if not candidatos.empty:
        valor_yoy = candidatos.iloc[-1][col]
        if pd.notna(ultimo_valor) and pd.notna(valor_yoy):
            return var_pct(ultimo_valor, valor_yoy)
        return np.nan
    else:
        datos_anio_ant = df_mensual[df_mensual.index.year == anio_anterior]
        if not datos_anio_ant.empty:
            valor_yoy = datos_anio_ant.iloc[-1][col]
            mes_encontrado = datos_anio_ant.index[-1].strftime('%b %Y')
            print(f"    ⚠ YoY fallback {col}: no hay {mes_buscado:02d}/{anio_anterior}, usa {mes_encontrado}")
            if pd.notna(ultimo_valor) and pd.notna(valor_yoy):
                return var_pct(ultimo_valor, valor_yoy)
        return np.nan


def calcular_ytd(df_mensual: pd.DataFrame, col: str, fecha_ultimo: pd.Timestamp) -> float:
    """
    Variación Year-to-Date: acumulado ene-mes_actual vs año anterior.
    Para Chango/Ticket: promedio ponderado YTD.
    """
    anio_actual = fecha_ultimo.year
    anio_anterior = anio_actual - 1
    mes_actual = fecha_ultimo.month

    # YTD año actual (solo meses reales, hasta fecha_ultimo)
    mask_ytd_actual = (df_mensual.index.year == anio_actual) & (df_mensual.index.month <= mes_actual)
    datos_ytd_actual = df_mensual[mask_ytd_actual]

    # YTD año anterior (mismo rango de meses)
    mask_ytd_ant = (df_mensual.index.year == anio_anterior) & (df_mensual.index.month <= mes_actual)
    datos_ytd_ant = df_mensual[mask_ytd_ant]

    if datos_ytd_actual.empty or datos_ytd_ant.empty:
        return np.nan

    # Para KPIs derivados: promedio ponderado YTD
    if col == 'Chango_Promedio':
        ytd_actual = datos_ytd_actual['Productos'].sum() / datos_ytd_actual['Clientes'].sum()
        ytd_ant = datos_ytd_ant['Productos'].sum() / datos_ytd_ant['Clientes'].sum()
    elif col == 'Ticket_Promedio':
        ytd_actual = datos_ytd_actual['Facturacion'].sum() / datos_ytd_actual['Clientes'].sum()
        ytd_ant = datos_ytd_ant['Facturacion'].sum() / datos_ytd_ant['Clientes'].sum()
    else:
        ytd_actual = datos_ytd_actual[col].sum()
        ytd_ant = datos_ytd_ant[col].sum()

    if pd.isna(ytd_actual) or pd.isna(ytd_ant) or ytd_ant == 0:
        return np.nan

    return var_pct(ytd_actual, ytd_ant)


# ==========================================================================
# 2) HEATMAP
# ==========================================================================
def graficar_heatmap_estacionalidad(df: pd.DataFrame, archivo_salida: str = "estacionalidad_clientes.png"):
    cmap_jp     = LinearSegmentedColormap.from_list('Custom', ('red', 'black', 'green'), N=256)
    cmap_jp_lat = LinearSegmentedColormap.from_list('Custom', ((0.2, 0.2, 0.2), 'green'), N=256)

    tabla = df.pivot_table(index='Year', columns='Month', values='var_Clientes').sort_index() / 100
    tabla.columns = MESES_ABREV

    media, desvstd, kurtosis = tabla.mean(), tabla.std(), tabla.kurt()

    plt.style.use('dark_background')
    fig = plt.figure(figsize=(20, 9))
    gs = gridspec.GridSpec(3, 2, figure=fig, width_ratios=[2.5, 1], hspace=0.3, wspace=0.2, top=0.9)

    ax_heat = fig.add_subplot(gs[:, 0])
    sns.heatmap(tabla, annot=True, fmt='.2%', cmap=cmap_jp, vmin=-0.4, vmax=0.4,
                linewidths=3, linecolor='black',
                cbar_kws={"shrink": 0.6, "label": "Variación mensual"}, ax=ax_heat)
    ax_heat.set_title("Estacionalidad mensual - Clientes (variación)", fontsize=16)
    ax_heat.set_xlabel("Mes")
    ax_heat.set_ylabel("Año")

    axes = [fig.add_subplot(gs[i, 1]) for i in range(3)]
    for ax, serie, label in zip(axes, [media, desvstd, kurtosis], ['Media', 'Desvío estándar', 'Kurtosis']):
        colores = cmap_jp_lat((serie - serie.mean()) / serie.std())
        ax.bar(MESES_ABREV, serie, color=colores, edgecolor='gray', width=0.7, label=label)
        ax.set_xticklabels(MESES_ABREV, rotation=45)
        ax.legend(fontsize=12)
        ax.grid(alpha=0.4)

    plt.tight_layout()
    fig.savefig(archivo_salida, dpi=150, facecolor=fig.get_facecolor())
    print(f"✔ Grilla de estacionalidad (Clientes) guardada en: {archivo_salida}")
    plt.show()


# ==========================================================================
# 3) DESCOMPOSICIÓN + HOLT-WINTERS
# ==========================================================================
def graficar_descomposicion_y_pronostico(df: pd.DataFrame, meses_pronostico: int = 12):
    ts = df['Clientes'].asfreq('ME')
    decomp = seasonal_decompose(ts.dropna(), model='additive', period=12)
    fig2 = decomp.plot()
    fig2.set_size_inches(12, 6)
    plt.tight_layout()
    plt.show()

    for col, color in [('Clientes', 'tab:orange'), ('Facturacion', 'tab:cyan')]:
        serie = df[col].asfreq('ME')
        if serie.dropna().shape[0] < 24:
            print(f"⚠ Insuficientes meses de {col} (≥24 requeridos) para Holt-Winters.")
            continue

        hw = ExponentialSmoothing(serie, trend='add', seasonal='add', seasonal_periods=12).fit()
        fitted = hw.fittedvalues

        plt.figure(figsize=(12, 6))
        plt.plot(serie[-36:], label=f'{col} real', color='black', linewidth=2)
        plt.plot(fitted[-36:], label='HW Ajustado', color=color, linewidth=1.5, alpha=0.8)

        if meses_pronostico > 0:
            forecast = hw.forecast(meses_pronostico)
            plt.plot(forecast, label=f'Pronóstico {meses_pronostico}m', 
                     color='tab:green', linestyle='--', linewidth=2)
            ultima_fecha = serie.index[-1]
            plt.axvline(x=ultima_fecha, color=MUTED, linestyle=':', alpha=0.7, linewidth=1.5)
            plt.text(ultima_fecha, plt.ylim()[1] * 0.95, '  ► Hoy', 
                     color=MUTED, fontsize=9, ha='left', va='top')
            plt.axvspan(ultima_fecha, forecast.index[-1], alpha=0.1, color='green', 
                       label='Zona proyectada')

        tit = f' (pronóstico: {meses_pronostico}m)' if meses_pronostico > 0 else ' (sin pronóstico)'
        plt.title(f'Holt–Winters: {col}{tit}')
        plt.legend(loc='upper left')
        plt.tight_layout()
        plt.show()


def graficar_comparativo_anual(df: pd.DataFrame):
    monthly_pivot = df.pivot_table(index='Month', columns='Year', values='Clientes').sort_index()
    plt.figure(figsize=(12, 6))
    for year in monthly_pivot.columns:
        plt.plot(monthly_pivot.index, monthly_pivot[year], marker='o', label=str(year))
    plt.xticks(ticks=range(1, 13), labels=MESES_ABREV, rotation=0)
    plt.xlabel('Mes')
    plt.ylabel('Clientes')
    plt.title('Estacionalidad mensual por año (valores absolutos - Clientes)')
    plt.legend(ncol=2, fontsize='small', bbox_to_anchor=(1.02, 1))
    plt.tight_layout()
    plt.show()


# ==========================================================================
# 4) CRUCE CON INFLACIÓN
# ==========================================================================
def cruzar_con_inflacion(df: pd.DataFrame, inflacion_path: str, 
                         anio_inicio: int = None, anio_fin: int = None) -> pd.DataFrame:
    try:
        inf = pd.read_excel(inflacion_path, engine='openpyxl')
    except FileNotFoundError:
        print(f"⚠ No se encontró '{inflacion_path}'. Se omite inflación.")
        return pd.DataFrame()

    inf.columns = [c.strip() for c in inf.columns]
    inf['Month'] = inf['Mes'].astype(str).str.strip().str.upper().map(MESES_ES)
    inf.rename(columns={'Año': 'Year'}, inplace=True)

    if anio_inicio is not None and anio_fin is not None:
        inf = inf[(inf['Year'] >= anio_inicio) & (inf['Year'] <= anio_fin)].copy()

    cols_kpi = ['Clientes', 'Productos', 'Facturacion', 'Chango_Promedio', 'Ticket_Promedio',
                'var_Clientes', 'var_Productos', 'var_Facturacion',
                'var_Chango_Promedio', 'var_Ticket_Promedio']
    datos_mes = df.reset_index()[['Year', 'Month'] + cols_kpi]

    cruce = pd.merge(
        datos_mes, inf[['Year', 'Month', 'Inflacion_Mensual', 'Inflacion_Anual']],
        on=['Year', 'Month'], how='inner'
    ).sort_values(['Year', 'Month']).reset_index(drop=True)

    if cruce.empty:
        print("⚠ Cruce ventas/inflación vacío.")
        return cruce

    cruce.to_excel("resumen_kpis_vs_inflacion.xlsx", index=False)
    print("✔ Resumen KPIs/Inflación guardado.")
    return cruce


# ==========================================================================
# 5) DASHBOARD PROFESIONAL
# ==========================================================================
def _kpi_card(ax, titulo, valor, sufijo, var_mom, var_yoy, var_ytd, color_valor=FG):
    ax.set_facecolor(PANEL)
    for s in ax.spines.values():
        s.set_color(GRID)
    ax.set_xticks([]); ax.set_yticks([])

    ax.text(0.05, 0.82, titulo.upper(), fontsize=10, color=MUTED, fontweight='bold', transform=ax.transAxes)
    ax.text(0.05, 0.48, f"{valor}{sufijo}", fontsize=22, color=color_valor, fontweight='bold', transform=ax.transAxes)

    def _fmt_var(v):
        if pd.isna(v):
            return "s/d", MUTED
        flecha = "▲" if v >= 0 else "▼"
        color = GREEN if v >= 0 else RED
        return f"{flecha}{v:+.1f}%", color

    mom_txt, mom_color = _fmt_var(var_mom)
    yoy_txt, yoy_color = _fmt_var(var_yoy)
    ytd_txt, ytd_color = _fmt_var(var_ytd)

    ax.text(0.05, 0.18, f"MoM {mom_txt}", fontsize=9, color=mom_color, transform=ax.transAxes)
    ax.text(0.38, 0.18, f"YoY {yoy_txt}", fontsize=9, color=yoy_color, transform=ax.transAxes)
    ax.text(0.70, 0.18, f"YTD {ytd_txt}", fontsize=9, color=ytd_color, transform=ax.transAxes)


def _linea_mensual(ax, x, y, titulo, color, fmt_y=None, inflacion=None, 
                   etiqueta_inf="Inflación mensual (%)", fecha_corte=None):
    ax.set_facecolor(PANEL)

    if fecha_corte is not None:
        mask_hist = x <= fecha_corte
        mask_proj = x > fecha_corte

        x_hist = x[mask_hist]
        y_hist = y[mask_hist]
        x_proj = x[mask_proj]
        y_proj = y[mask_proj]

        if len(x_hist) > 0:
            ax.plot(x_hist, y_hist, color=color, linewidth=2.5, marker='o', markersize=4, label='Histórico')
        if len(x_proj) > 0:
            ax.plot(x_proj, y_proj, color=PROJ, linewidth=2.5, marker='s', markersize=4, 
                   linestyle='--', label='Proyectado')
            x_proj_max = x_proj.max()
            ax.axvspan(fecha_corte, x_proj_max, alpha=0.08, color=PROJ, zorder=0)
            x_proj_arr = np.sort(np.asarray(x_proj))
            mid_proj = x_proj_arr[len(x_proj_arr)//2]
            y_range = ax.get_ylim()
            y_pos = y_range[0] + (y_range[1] - y_range[0]) * 0.05
            ax.text(mid_proj, y_pos, 'PROYECTADO', fontsize=7, color=PROJ, 
                   ha='center', va='bottom', alpha=0.7, fontweight='bold',
                   bbox=dict(boxstyle='round,pad=0.3', facecolor=PANEL, edgecolor=PROJ, alpha=0.5))

        # Límite derecho del eje = último punto realmente graficado (histórico o
        # proyectado). Sin esto, el margen automático de matplotlib (~5%) agrega
        # 2-3 meses "fantasma" al final del eje que no corresponden a ningún dato.
        # Se usan .min()/.max() en vez de indexado posicional [0]/[-1] porque x
        # puede ser tanto un DatetimeIndex (posicional) como una pd.Series con un
        # índice arbitrario (donde x[-1] busca la ETIQUETA -1, no la posición, y
        # revienta con KeyError si esa etiqueta no existe).
        xmin_dato = x_hist.min() if len(x_hist) > 0 else (x_proj.min() if len(x_proj) > 0 else x.min())
        xmax_dato = x_proj.max() if len(x_proj) > 0 else (x_hist.max() if len(x_hist) > 0 else x.max())
        ax.set_xlim(xmin_dato, xmax_dato)
    else:
        ax.plot(x, y, color=color, linewidth=2.5, marker='o', markersize=4)
        if len(x) > 0:
            ax.set_xlim(x.min(), x.max())

    ax.set_title(titulo, fontsize=11, color=FG, loc='left', fontweight='bold')
    ax.grid(alpha=0.15, color=GRID)
    ax.tick_params(colors=MUTED, labelsize=8)
    for s in ax.spines.values():
        s.set_color(GRID)

    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=max(1, len(x)//12)))
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')

    if fmt_y:
        ax.yaxis.set_major_formatter(fmt_y)
    if inflacion is not None:
        ax2 = ax.twinx()
        ax2.plot(x, inflacion, color=AMBER, linewidth=1.5, linestyle='--', alpha=0.8)
        ax2.tick_params(colors=MUTED, labelsize=8)
        for s in ax2.spines.values():
            s.set_color(GRID)
        ax2.set_ylabel(etiqueta_inf, fontsize=8, color=AMBER)

    if fecha_corte is not None and len(x_proj) > 0:
        ax.legend(loc='upper left', fontsize=7, framealpha=0.3)

    return ax


def generar_dashboard(df: pd.DataFrame, cruce: pd.DataFrame, 
                      archivo_salida: str = "dashboard_kpis.png",
                      anio_inicio: int = None, anio_fin: int = None,
                      meses_pronostico: int = 0):
    plt.style.use('dark_background')
    fig = plt.figure(figsize=(24, 13), facecolor=BG)
    gs = gridspec.GridSpec(4, 4, figure=fig, height_ratios=[0.7, 1.1, 1.1, 1.1],
                            hspace=0.42, wspace=0.16, top=0.92, bottom=0.05, left=0.03, right=0.99)

    # ── PREPARAR DATOS MENSUALES ──
    df_mensual = preparar_datos_mensuales(df)

    # Guardar copia de datos históricos ANTES de agregar pronóstico
    df_historico = df_mensual.copy()

    # ── PRONÓSTICO ──
    fecha_corte = None
    if meses_pronostico > 0:
        for col in ['Clientes', 'Facturacion']:
            serie = df_mensual[col].dropna()
            if len(serie) >= 24:
                hw = ExponentialSmoothing(serie, trend='add', seasonal='add', seasonal_periods=12).fit()
                forecast = hw.forecast(meses_pronostico)

                ultima_fecha = serie.index[-1]
                fechas_forecast = pd.date_range(start=ultima_fecha + pd.DateOffset(months=1), 
                                                periods=meses_pronostico, freq='ME')

                forecast_df = pd.DataFrame({col: forecast.values}, index=fechas_forecast)
                df_mensual = pd.concat([df_mensual, forecast_df], axis=0)

        # Recalcular Ticket para meses proyectados (Facturacion proyectada / Clientes proyectada)
        # Chango NO se calcula para proyectados (Productos no proyectado)
        df_mensual['Ticket_Promedio'] = df_mensual['Facturacion'] / df_mensual['Clientes']
        # Chango: mantener valor histórico, NaN para proyectados
        df_mensual['Chango_Promedio'] = df_mensual['Productos'] / df_mensual['Clientes']

        fecha_corte = df_historico.index[-1]

    # ── OBTENER ÚLTIMO MES REAL (con datos completos) ──
    ultimo_idx, fecha_ultimo = obtener_ultimo_mes_real(df_historico)

    print(f"\n  📊 Último mes real: {fecha_ultimo.strftime('%b %Y')} (índice: {ultimo_idx})")

    # Usar el valor del último mes real desde df_historico (sin contaminación del pronóstico)
    ultimo = df_historico.loc[fecha_ultimo] if fecha_ultimo in df_historico.index else df_historico.iloc[ultimo_idx]

    # ── CALCULAR VARIACIONES (sobre datos históricos) ──
    variaciones = {}
    cols_kpi = ['Clientes', 'Productos', 'Facturacion', 'Chango_Promedio', 'Ticket_Promedio']
    for col in cols_kpi:
        v_mom = calcular_mom(df_historico, col, ultimo_idx)
        v_yoy = calcular_yoy(df_historico, col, fecha_ultimo)
        v_ytd = calcular_ytd(df_historico, col, fecha_ultimo)
        variaciones[col] = {'mom': v_mom, 'yoy': v_yoy, 'ytd': v_ytd}

        # Debug
        val = ultimo[col]
        print(f"    {col:20s}: {str(val):>15s} | MoM: {v_mom:>8.1f}% | YoY: {v_yoy:>8.1f}% | YTD: {v_ytd:>8.1f}%")

    # ── FILA 0: KPI CARDS ──
    kpis = [
        ("Clientes", f"{ultimo['Clientes']:,.0f}", ""),
        ("Productos", f"{ultimo['Productos']:,.0f}", ""),
        ("Facturación", f"{ultimo['Facturacion']:,.0f}", ""),
        ("Chango promedio", f"{ultimo['Chango_Promedio']:.2f}", " u/cli"),
        ("Ticket promedio", f"{ultimo['Ticket_Promedio']:,.0f}", " $/cli"),
    ]
    gs_kpi = gridspec.GridSpecFromSubplotSpec(1, 5, subplot_spec=gs[0, :], wspace=0.25)
    for i, ((titulo, valor, sufijo), col) in enumerate(zip(kpis, cols_kpi)):
        ax = fig.add_subplot(gs_kpi[0, i])
        v = variaciones[col]
        _kpi_card(ax, titulo, valor, sufijo, v['mom'], v['yoy'], v['ytd'])

    # ── FILA 1: TENDENCIAS ──
    x_mensual = df_mensual.index

    # NOTA: Holt-Winters solo se corre para 'Clientes' y 'Facturacion' (ver más abajo).
    # 'Productos' (y por lo tanto 'Chango_Promedio', que depende de Productos) NUNCA
    # se pronostica. Si a esos gráficos se les pasa x_mensual (que incluye las fechas
    # futuras agregadas por el concat del pronóstico) y fecha_corte, el eje X se
    # estira igual hasta el último mes proyectado aunque no haya ningún dato ahí
    # (queda en blanco). Por eso acá usan df_historico y fecha_corte=None: su eje
    # termina exactamente en el último mes con datos reales.
    ax1 = fig.add_subplot(gs[1, 0])
    _linea_mensual(ax1, x_mensual, df_mensual['Clientes'], "Clientes (mensual)", BLUE, fecha_corte=fecha_corte)

    ax2 = fig.add_subplot(gs[1, 1])
    _linea_mensual(ax2, df_historico.index, df_historico['Productos'],
                   "Productos vendidos (mensual)", GREEN, fecha_corte=None)

    ax3 = fig.add_subplot(gs[1, 2])
    _linea_mensual(ax3, x_mensual, df_mensual['Facturacion'], "Facturación (mensual)", AMBER, fecha_corte=fecha_corte)

    ax4 = fig.add_subplot(gs[1, 3])
    _linea_mensual(ax4, df_historico.index, df_historico['Chango_Promedio'],
                   "Chango promedio (Productos/Cliente)", PURPLE, fecha_corte=None)

    # ── FILA 2: Ticket e inflación ──
    ax5 = fig.add_subplot(gs[2, 0])
    _linea_mensual(ax5, x_mensual, df_mensual['Ticket_Promedio'], "Ticket promedio (Facturación/Cliente)", RED, fecha_corte=fecha_corte)

    if not cruce.empty:
        cruce_fechas = pd.to_datetime(cruce['Year'].astype(str) + '-' + cruce['Month'].astype(str).str.zfill(2) + '-01')
        cruce_fechas = cruce_fechas + pd.offsets.MonthEnd(0)

        ax6 = fig.add_subplot(gs[2, 1])
        _linea_mensual(ax6, cruce_fechas, cruce['var_Ticket_Promedio'], 
                       "Var. Ticket promedio vs Inflación", RED,
                       inflacion=cruce['Inflacion_Mensual'])

        ax7 = fig.add_subplot(gs[2, 2])
        _linea_mensual(ax7, cruce_fechas, cruce['var_Facturacion'], 
                       "Var. Facturación vs Inflación", AMBER,
                       inflacion=cruce['Inflacion_Mensual'])

        ax8 = fig.add_subplot(gs[2, 3])
        _linea_mensual(ax8, cruce_fechas, cruce['var_Chango_Promedio'], 
                       "Var. Chango promedio vs Inflación", PURPLE,
                       inflacion=cruce['Inflacion_Mensual'])
    else:
        for i in range(1, 4):
            ax = fig.add_subplot(gs[2, i])
            ax.set_facecolor(PANEL)
            ax.text(0.5, 0.5, "Sin datos de inflación\npara cruzar", ha='center', va='center',
                    color=MUTED, fontsize=10, transform=ax.transAxes)
            ax.set_xticks([]); ax.set_yticks([])

    # ── FILA 3: Correlaciones + Tabla resumen ──
    ax9 = fig.add_subplot(gs[3, 0:2])
    ax9.set_facecolor(PANEL)
    for s in ax9.spines.values():
        s.set_color(GRID)
    if not cruce.empty:
        corr_cols = ['var_Clientes', 'var_Productos', 'var_Facturacion', 'var_Chango_Promedio', 'var_Ticket_Promedio']
        etiquetas = ['Clientes', 'Productos', 'Facturación', 'Chango prom.', 'Ticket prom.']
        corrs = [cruce[c].corr(cruce['Inflacion_Mensual']) for c in corr_cols]
        colores_b = [GREEN if v >= 0 else RED for v in corrs]
        ax9.barh(etiquetas, corrs, color=colores_b, edgecolor=GRID)
        ax9.axvline(0, color=MUTED, linewidth=0.8)
        ax9.set_title("Correlación variaciones mensuales vs Inflación", fontsize=11, color=FG,
                      loc='left', fontweight='bold')
        ax9.tick_params(colors=MUTED, labelsize=9)
        ax9.grid(alpha=0.15, color=GRID, axis='x')
    else:
        ax9.text(0.5, 0.5, "Sin datos de inflación", ha='center', va='center', color=MUTED, transform=ax9.transAxes)
        ax9.set_xticks([]); ax9.set_yticks([])

    # Tabla resumen con 5 columnas
    ax10 = fig.add_subplot(gs[3, 2:4])
    ax10.set_facecolor(PANEL)
    ax10.set_xticks([]); ax10.set_yticks([])
    for s in ax10.spines.values():
        s.set_color(GRID)
    ax10.set_title("Resumen del último mes", fontsize=11, color=FG, loc='left', fontweight='bold')

    filas = [
        ("Clientes", f"{ultimo['Clientes']:,.0f}", 'Clientes'),
        ("Productos", f"{ultimo['Productos']:,.0f}", 'Productos'),
        ("Facturación", f"${ultimo['Facturacion']:,.0f}", 'Facturacion'),
        ("Chango promedio", f"{ultimo['Chango_Promedio']:.2f} u/cli", 'Chango_Promedio'),
        ("Ticket promedio", f"${ultimo['Ticket_Promedio']:,.0f}", 'Ticket_Promedio'),
    ]

    y0 = 0.88
    ax10.text(0.00, y0, "KPI", fontsize=8, color=MUTED, fontweight='bold', transform=ax10.transAxes)
    ax10.text(0.32, y0, "Valor", fontsize=8, color=MUTED, fontweight='bold', transform=ax10.transAxes)
    ax10.text(0.52, y0, "MoM", fontsize=8, color=MUTED, fontweight='bold', transform=ax10.transAxes)
    ax10.text(0.68, y0, "YoY", fontsize=8, color=MUTED, fontweight='bold', transform=ax10.transAxes)
    ax10.text(0.84, y0, "YTD", fontsize=8, color=MUTED, fontweight='bold', transform=ax10.transAxes)

    y0 -= 0.15
    for nombre, valor, col_key in filas:
        v = variaciones[col_key]

        ax10.text(0.00, y0, nombre, fontsize=9, color=FG, transform=ax10.transAxes)
        ax10.text(0.32, y0, valor, fontsize=9, color=FG, transform=ax10.transAxes)

        for metrica, x_pos in [('mom', 0.52), ('yoy', 0.68), ('ytd', 0.84)]:
            val = v[metrica]
            if pd.isna(val):
                txt, color = "s/d", MUTED
            else:
                flecha = "▲" if val >= 0 else "▼"
                color = GREEN if val >= 0 else RED
                txt = f"{flecha}{val:+.1f}%"
            ax10.text(x_pos, y0, txt, fontsize=9, color=color, transform=ax10.transAxes)

        y0 -= 0.16

    # Título
    rango_txt = f" | Período: {anio_inicio}-{anio_fin}" if anio_inicio is not None else ""
    pron_txt = f" | Pronóstico: {meses_pronostico}m" if meses_pronostico > 0 else " | Sin pronóstico"

    fig.suptitle(f"Dashboard KPIs Comercial — Clientes · Productos · Facturación   (corte: {fecha_ultimo.strftime('%B %Y').capitalize()}{rango_txt}{pron_txt})",
                 fontsize=16, color=FG, fontweight='bold', x=0.045, ha='left')

    fig.savefig(archivo_salida, dpi=150, facecolor=BG)
    print(f"\n✔ Dashboard guardado: '{archivo_salida}'")
    plt.show()


# ==========================================================================
# MAIN
# ==========================================================================
def main(excel_path: str, inflacion_path: str = "Inflacion.xlsx"):
    df_completo = cargar_datos(excel_path)

    anio_inicio, anio_fin = solicitar_filtro_anios(df_completo)
    df = aplicar_filtro_anios(df_completo, anio_inicio, anio_fin)

    if df.empty:
        print("\n❌ Dataset vacío tras filtro. Abortando.")
        return df_completo

    meses_pronostico = solicitar_meses_pronostico()

    print("\n" + "=" * 60)
    print("  Generando análisis...")
    print("=" * 60)

    partes = []
    if anio_inicio is not None:
        partes.append(f"{anio_inicio}_{anio_fin}")
    partes.append(f"pronostico_{meses_pronostico}m" if meses_pronostico > 0 else "sin_pronostico")
    sufijo = "_".join(partes)

    archivo_heatmap = f"estacionalidad_clientes_{sufijo}.png"
    graficar_heatmap_estacionalidad(df, archivo_heatmap)

    cruce = cruzar_con_inflacion(df, inflacion_path, anio_inicio, anio_fin)

    if not cruce.empty:
        corr_ticket = cruce['var_Ticket_Promedio'].corr(cruce['Inflacion_Mensual'])
        corr_fact   = cruce['var_Facturacion'].corr(cruce['Inflacion_Mensual'])
        corr_chango = cruce['var_Chango_Promedio'].corr(cruce['Inflacion_Mensual'])
        print("\n=== Correlación con Inflación mensual ===")
        print(f"Ticket promedio:  {corr_ticket:.3f}")
        print(f"Facturación:      {corr_fact:.3f}")
        print(f"Chango promedio:  {corr_chango:.3f}")

    archivo_salida = f"dashboard_kpis_{sufijo}.png"

    generar_dashboard(df, cruce, archivo_salida, anio_inicio, anio_fin, meses_pronostico)

    return df


if __name__ == "__main__":
    excel_file = "datos_estacionalidad.xlsx"
    inflacion_file = "Inflacion.xlsx"
    main(excel_file, inflacion_file)
