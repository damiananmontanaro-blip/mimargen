'use client';
/**
 * MI MARGEN — Módulos del Excel v7 en React.
 * Cada componente replica una hoja. Toda la matemática vive en lib/calc.ts (validado vs Excel).
 */
import { useMemo, useState } from 'react';
import {
  calcMargenes, calcPrecios, calcPrecioNuevo, calcResultados, calcCaja,
  calcForecast, tablaDescuentos, calcDescuento, calcAlertas, calcMatriz, simular,
  Parametros,
} from '@/lib/calc';
import { AppState } from '@/lib/store';
import { PAISES, fmtMoney, fmtPct, fmtNum, presetToParams } from '@/lib/country';

type Props = { s: AppState; set: (s: AppState) => void };

const num = (v: string): number => {
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const pctIn = (v: string): number => num(v) / 100;

// ============================== DATOS ==============================
export function ModDatos({ s, set }: Props) {
  const cfg = PAISES[s.pais];
  const setParam = (k: keyof Parametros, v: number) => set({ ...s, params: { ...s.params, [k]: v } });

  const cambiarActividad = (act: string) =>
    set({ ...s, actividad: act, params: { ...presetToParams(s.pais, act), ivaPct: s.params.ivaPct } });

  const totalFijos = s.fijos.reduce((t, f) => t + f.monto, 0);

  return (
    <div>
      <h2>Datos de tu negocio</h2>
      <p className="desc">
        Elegí tu actividad para precargar valores típicos de {cfg.nombre} y después pisalos con tus datos
        reales. Todo el sistema se recalcula solo.
      </p>

      <div className="card">
        <h3>A · Actividad y parámetros</h3>
        <div className="inline-flds" style={{ marginBottom: 16 }}>
          <div>
            <label className="fld">Actividad</label>
            <select className="inp" value={s.actividad} onChange={(e) => cambiarActividad(e.target.value)}>
              {cfg.actividades.map((a) => (
                <option key={a.actividad}>{a.actividad}</option>
              ))}
            </select>
            <p className="help">Precarga comisiones, {cfg.ventasTaxLabel}, plazos y margen objetivo del rubro.</p>
          </div>
        </div>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr><th>Parámetro</th><th className="r">Valor usado (%)</th><th>Ayuda</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>% Comisión medios de pago</td>
                <td className="r"><input value={(s.params.comisionPct * 100).toFixed(2)} onChange={(e) => setParam('comisionPct', pctIn(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{cfg.comisionAyuda}</td>
              </tr>
              <tr>
                <td>% {cfg.ventasTaxLabel} sobre ventas</td>
                <td className="r"><input value={(s.params.iibbPct * 100).toFixed(2)} onChange={(e) => setParam('iibbPct', pctIn(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{cfg.ventasTaxAyuda}</td>
              </tr>
              <tr>
                <td>% Costo financiero</td>
                <td className="r"><input value={(s.params.financieroPct * 100).toFixed(2)} onChange={(e) => setParam('financieroPct', pctIn(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>Descuento de cheques, descubierto, financiación de cobros.</td>
              </tr>
              <tr>
                <td>% IVA ventas</td>
                <td className="r"><input value={(s.params.ivaPct * 100).toFixed(2)} onChange={(e) => setParam('ivaPct', pctIn(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{cfg.ivaLabel} por defecto en {cfg.nombre}. Cambialo si tu rubro tiene alícuota reducida.</td>
              </tr>
              <tr>
                <td className="b">MARGEN OBJETIVO sobre ventas</td>
                <td className="r"><input value={(s.params.margenObjetivo * 100).toFixed(1)} onChange={(e) => setParam('margenObjetivo', pctIn(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>Lo que querés que te quede después de los costos ocultos.</td>
              </tr>
              <tr>
                <td>Días de stock</td>
                <td className="r"><input value={s.params.diasStock} onChange={(e) => setParam('diasStock', num(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>Desde que comprás hasta que vendés.</td>
              </tr>
              <tr>
                <td>Días de cobro (promedio)</td>
                <td className="r"><input value={s.params.diasCobro} onChange={(e) => setParam('diasCobro', num(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>Efectivo=0, tarjeta≈10-20, cta. cte.=tu plazo real.</td>
              </tr>
              <tr>
                <td>Días de pago a proveedores</td>
                <td className="r"><input value={s.params.diasPago} onChange={(e) => setParam('diasPago', num(e.target.value))} /></td>
                <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>Plazo promedio que te dan tus proveedores.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>B · Costos fijos mensuales (sin IVA) — Total: {fmtMoney(totalFijos, s.pais)}</h3>
        <table className="tbl">
          <thead><tr><th>Concepto</th><th className="r">Monto mensual</th><th></th></tr></thead>
          <tbody>
            {s.fijos.map((f, i) => (
              <tr key={i}>
                <td><input className="wide" value={f.concepto} onChange={(e) => { const fijos = [...s.fijos]; fijos[i] = { ...f, concepto: e.target.value }; set({ ...s, fijos }); }} /></td>
                <td className="r"><input value={f.monto} onChange={(e) => { const fijos = [...s.fijos]; fijos[i] = { ...f, monto: num(e.target.value) }; set({ ...s, fijos }); }} /></td>
                <td><button className="tab" onClick={() => set({ ...s, fijos: s.fijos.filter((_, j) => j !== i) })}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => set({ ...s, fijos: [...s.fijos, { concepto: 'Nuevo concepto', monto: 0 }] })}>+ Agregar costo fijo</button>
        <p className="help" style={{ marginTop: 10 }}>
          Test infalible: si mañana no vendés NADA, ¿ese costo desaparece? Si desaparece es VARIABLE (va en el
          producto). Si lo pagás igual, es FIJO (va acá). No prorratees el alquiler dentro del costo del producto.
        </p>
      </div>

      <div className="card">
        <h3>C · Productos o servicios (hasta 20; precios y costos SIN IVA)</h3>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr><th>Producto / Servicio</th><th className="r">Precio unitario (sin IVA)</th><th className="r">Costo variable unitario</th><th className="r">Unidades / mes</th><th></th></tr>
            </thead>
            <tbody>
              {s.productos.map((p, i) => (
                <tr key={i}>
                  <td><input className="wide" value={p.nombre} onChange={(e) => { const productos = [...s.productos]; productos[i] = { ...p, nombre: e.target.value }; set({ ...s, productos }); }} /></td>
                  <td className="r"><input value={p.precio} onChange={(e) => { const productos = [...s.productos]; productos[i] = { ...p, precio: num(e.target.value) }; set({ ...s, productos }); }} /></td>
                  <td className="r"><input value={p.costo} onChange={(e) => { const productos = [...s.productos]; productos[i] = { ...p, costo: num(e.target.value) }; set({ ...s, productos }); }} /></td>
                  <td className="r"><input value={p.unidades} onChange={(e) => { const productos = [...s.productos]; productos[i] = { ...p, unidades: num(e.target.value) }; set({ ...s, productos }); }} /></td>
                  <td><button className="tab" onClick={() => set({ ...s, productos: s.productos.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.productos.length < 20 && (
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => set({ ...s, productos: [...s.productos, { nombre: `Producto ${String.fromCharCode(65 + s.productos.length)}`, precio: 0, costo: 0, unidades: 0 }] })}>
            + Agregar producto
          </button>
        )}
      </div>
    </div>
  );
}

// ============================== helpers de inputs ==============================
function toInputs(s: AppState) {
  return { params: s.params, costosFijos: s.fijos.reduce((t, f) => t + f.monto, 0), productos: s.productos };
}

// ============================== DASHBOARD ==============================
export function ModDashboard({ s }: { s: AppState }) {
  const inp = toInputs(s);
  const { productos, totales } = useMemo(() => calcMargenes(inp), [s]);
  const caja = useMemo(() => calcCaja(inp), [s]);
  const fc = useMemo(() => calcForecast(inp, s.forecast.crecVentas, s.forecast.inflCostos, s.forecast.ajustePrecios), [s]);
  const pierden = productos.filter((p) => p.semaforo === 'pierde').length;
  const amarillos = productos.filter((p) => p.semaforo === 'no_absorbe').length;
  const top = productos.length ? productos.reduce((a, b) => (a.contribucionTotal >= b.contribucionTotal ? a : b)) : null;
  const resM12 = fc[11].resultado;
  const P = s.pais;
  return (
    <div>
      <h2>Dashboard: tu negocio en una pantalla</h2>
      <p className="desc">Los números que un buen controller miraría todos los meses. Sale todo de la pestaña DATOS.</p>
      <div className="kpis">
        <div className="kpi"><div className="lbl">Facturación mensual</div><div className="val num">{fmtMoney(totales.facturacion, P)}</div></div>
        <div className={`kpi ${totales.resultadoOperativo < 0 ? 'neg' : 'pos'}`}><div className="lbl">Resultado operativo</div><div className="val num">{fmtMoney(totales.resultadoOperativo, P)}</div></div>
        <div className="kpi"><div className="lbl">Margen de contribución</div><div className="val num">{fmtPct(totales.margenPonderado, P)}</div></div>
        <div className="kpi"><div className="lbl">Punto de equilibrio ($/mes)</div><div className="val num">{fmtMoney(totales.puntoEquilibrio, P)}</div></div>
        <div className={`kpi ${totales.margenSeguridad < 0.15 ? 'neg' : ''}`}><div className="lbl">Margen de seguridad</div><div className="val num">{fmtPct(totales.margenSeguridad, P)}</div></div>
        <div className="kpi"><div className="lbl">Ciclo de caja (días)</div><div className="val num">{fmtNum(caja.cicloCaja, P, 1)}</div></div>
        <div className="kpi"><div className="lbl">Capital de trabajo necesario</div><div className="val num">{fmtMoney(caja.capitalTrabajo, P)}</div></div>
        <div className={`kpi ${pierden > 0 ? 'neg' : ''}`}><div className="lbl">Productos 🔴 que pierden plata</div><div className="val num">{pierden}</div></div>
        <div className={`kpi ${amarillos > 0 ? 'neg' : ''}`}><div className="lbl">Productos 🟡 que no absorben fijos</div><div className="val num">{amarillos}</div></div>
        <div className="kpi"><div className="lbl">Producto que más contribuye</div><div className="val">{top ? top.nombre : '—'}</div></div>
        <div className={`kpi ${resM12 < 0 ? 'neg' : 'pos'}`}><div className="lbl">Resultado proyectado mes 12</div><div className="val num">{fmtMoney(resM12, P)}</div></div>
        <div className="kpi"><div className="lbl">Peso de fijos sobre ventas</div><div className="val num">{fmtPct(totales.pesoFijos, P)}</div></div>
      </div>
      <div className="banner info" style={{ marginTop: 20 }}>
        Si un número está en rojo (resultado, forecast o margen de seguridad), empezá por PRECIOS y después mirá CAJA.
      </div>
    </div>
  );
}

// ============================== ALERTAS ==============================
export function ModAlertas({ s }: { s: AppState }) {
  const inp = toInputs(s);
  const caja = useMemo(() => calcCaja(inp), [s]);
  const fc = useMemo(() => calcForecast(inp, s.forecast.crecVentas, s.forecast.inflCostos, s.forecast.ajustePrecios), [s]);
  const alertas = useMemo(() => calcAlertas(inp, { forecast: fc, caja }), [s]);
  const activas = alertas.filter((a) => !a.ok).length;
  const P = s.pais;
  const fmtValor = (a: (typeof alertas)[0]) =>
    a.control.includes('días') || a.control.includes('Productos') ? fmtNum(a.valor, P, a.control.includes('días') ? 1 : 0)
    : Math.abs(a.valor) <= 1.5 ? fmtPct(a.valor, P) : fmtMoney(a.valor, P);
  return (
    <div>
      <h2>Alertas: diagnóstico automático</h2>
      <p className="desc">Controles que un controller haría todos los meses. Se recalculan solos con tus datos.</p>
      <div className={`banner ${activas === 0 ? 'info' : 'warn'}`}>Alertas activas: <b>{activas}</b></div>
      <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>#</th><th>Control</th><th className="r">Valor actual</th><th>Umbral sano</th><th>Estado</th><th>Qué hacer</th></tr></thead>
          <tbody>
            {alertas.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td><td>{a.control}</td>
                <td className="r num">{fmtValor(a)}</td>
                <td>{a.umbral}</td>
                <td>{a.ok ? <span className="tag verde">✔ OK</span> : <span className="tag amarillo">⚠ Atención</span>}</td>
                <td style={{ whiteSpace: 'normal', maxWidth: 340, fontSize: 12.5 }}>{a.ok ? '—' : a.accion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="help" style={{ marginTop: 14 }}>
        Regla de uso: no intentes arreglar todo junto. Primero caja, después rentabilidad, por último lo estructural.
      </p>
    </div>
  );
}

// ============================== PRECIOS ==============================
export function ModPrecios({ s }: { s: AppState }) {
  const P = s.pais;
  const [costo, setCosto] = useState(10000);
  const [margen, setMargen] = useState(s.params.margenObjetivo);
  const rapida = useMemo(() => calcPrecioNuevo(costo, margen, s.params), [costo, margen, s]);
  const tabla = useMemo(() => calcPrecios(toInputs(s)), [s]);
  return (
    <div>
      <h2>¿Qué precio pongo para no perder margen?</h2>
      <p className="desc">
        El error clásico: costo × 1,20 NO te da 20% de margen. El precio correcto sale de DIVIDIR el costo
        por (1 − margen deseado − costos ocultos).
      </p>
      <div className="card">
        <h3>Calculadora rápida (para cotizar un producto nuevo)</h3>
        <div className="inline-flds">
          <div><label className="fld">Costo variable unitario (sin IVA)</label><input className="inp" value={costo} onChange={(e) => setCosto(num(e.target.value))} /></div>
          <div><label className="fld">Margen deseado (%)</label><input className="inp" value={(margen * 100).toFixed(1)} onChange={(e) => setMargen(pctIn(e.target.value))} /></div>
        </div>
        <div className="kpis" style={{ marginTop: 18 }}>
          <div className="kpi"><div className="lbl">Precio necesario (sin IVA)</div><div className="val num">{rapida.imposible ? 'Imposible' : fmtMoney(rapida.precioNecesario!, P)}</div></div>
          <div className="kpi pos"><div className="lbl">Precio final al público (con IVA)</div><div className="val num">{rapida.imposible ? '—' : fmtMoney(rapida.precioFinalConIva!, P)}</div></div>
        </div>
        {!rapida.imposible && (
          <div className="banner warn" style={{ marginTop: 16 }}>
            Con markup mal hecho (costo × {fmtNum(1 + margen, P, 2)}) hubieras cobrado{' '}
            <b>{fmtMoney(rapida.precioMarkupMal, P)}</b> y tu margen real sería{' '}
            <b>{fmtPct(rapida.margenRealConMarkupMal, P)}</b> en vez de {fmtPct(margen, P, 0)}.
          </div>
        )}
        {rapida.imposible && <div className="banner danger" style={{ marginTop: 16 }}>Margen deseado + costos ocultos ≥ 100%: matemáticamente imposible. Bajá el objetivo o los ocultos.</div>}
      </div>
      <div className="card">
        <h3>Tus productos: precio actual vs. precio necesario para tu objetivo ({fmtPct(s.params.margenObjetivo, P, 0)})</h3>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Producto</th><th className="r">Costo variable</th><th className="r">Precio actual</th><th className="r">Margen real actual</th><th className="r">Precio necesario</th><th className="r">Sugerido con IVA</th><th className="r">Diferencia</th><th>Semáforo</th></tr></thead>
            <tbody>
              {tabla.map((p) => (
                <tr key={p.nombre}>
                  <td className="b">{p.nombre}</td>
                  <td className="r num">{fmtMoney(p.costo, P)}</td>
                  <td className="r num">{fmtMoney(p.precioActual, P)}</td>
                  <td className="r num">{fmtPct(p.margenRealActual, P)}</td>
                  <td className="r num">{p.precioNecesario === null ? '—' : fmtMoney(p.precioNecesario, P)}</td>
                  <td className="r num">{p.precioSugeridoConIva === null ? '—' : fmtMoney(p.precioSugeridoConIva, P)}</td>
                  <td className="r num">{p.diferenciaPct === null ? '—' : fmtPct(p.diferenciaPct, P)}</td>
                  <td>
                    {p.semaforo === 'ok' && <span className="tag verde">🟢 Precio OK</span>}
                    {p.semaforo === 'limite' && <span className="tag amarillo">🟡 Al límite</span>}
                    {p.semaforo === 'insuficiente' && <span className="tag rojo">🔴 Insuficiente</span>}
                    {p.semaforo === 'objetivo_imposible' && <span className="tag rojo">Objetivo imposible</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================== MARGENES ==============================
export function ModMargenes({ s }: { s: AppState }) {
  const P = s.pais;
  const { productos, totales } = useMemo(() => calcMargenes(toInputs(s)), [s]);
  return (
    <div>
      <h2>Margen que creés vs. margen REAL</h2>
      <p className="desc">
        El markup es lo que creés que ganás. El margen real descuenta comisiones, {PAISES[P].ventasTaxLabel} y
        costo financiero. La diferencia es la plata que se te escapa sin que la veas.
      </p>
      <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>Producto</th><th className="r">Facturación</th><th className="r">Markup s/costo</th><th className="r">Margen bruto</th><th className="r">Margen REAL</th><th className="r">Contribución $/mes</th><th>Semáforo</th><th className="r">Suba p/ objetivo</th><th className="r">o baja de costo</th></tr></thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.nombre}>
                <td className="b">{p.nombre}</td>
                <td className="r num">{fmtMoney(p.facturacion, P)}</td>
                <td className="r num">{fmtPct(p.markup, P)}</td>
                <td className="r num">{fmtPct(p.margenBruto, P)}</td>
                <td className="r num b">{fmtPct(p.margenReal, P)}</td>
                <td className="r num">{fmtMoney(p.contribucionTotal, P)}</td>
                <td>
                  {p.semaforo === 'pierde' && <span className="tag rojo">🔴 Pierde plata</span>}
                  {p.semaforo === 'no_absorbe' && <span className="tag amarillo">🟡 No absorbe fijos</span>}
                  {p.semaforo === 'sano' && <span className="tag verde">🟢 Sano</span>}
                </td>
                <td className="r num">{p.subaNecesaria === null ? '✔ Cumple' : `+${fmtPct(p.subaNecesaria, P)}`}</td>
                <td className="r num">{p.bajaCostoNecesaria === null ? '—' : `−${fmtPct(p.bajaCostoNecesaria, P)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kpis" style={{ marginTop: 20 }}>
        <div className="kpi"><div className="lbl">Facturación total</div><div className="val num">{fmtMoney(totales.facturacion, P)}</div></div>
        <div className="kpi"><div className="lbl">Margen ponderado</div><div className="val num">{fmtPct(totales.margenPonderado, P)}</div></div>
        <div className={`kpi ${totales.resultadoOperativo < 0 ? 'neg' : 'pos'}`}><div className="lbl">Resultado operativo</div><div className="val num">{fmtMoney(totales.resultadoOperativo, P)}</div></div>
        <div className="kpi"><div className="lbl">Punto de equilibrio</div><div className="val num">{fmtMoney(totales.puntoEquilibrio, P)}</div></div>
        <div className="kpi"><div className="lbl">Margen de seguridad</div><div className="val num">{fmtPct(totales.margenSeguridad, P)}</div></div>
      </div>
    </div>
  );
}

// ============================== RESULTADOS ==============================
export function ModResultados({ s, set }: Props) {
  const P = s.pais;
  const cfg = PAISES[P];
  const eerr = useMemo(() => calcResultados(toInputs(s), s.tasaGanancias), [s]);
  const filas: Array<[string, number, number | null, boolean]> = [
    ['Ventas (sin IVA)', eerr.ventas, 1, false],
    ['(−) Costos variables', eerr.costosVariables, eerr.pct.costosVariables, false],
    ['MARGEN BRUTO', eerr.margenBruto, eerr.pct.margenBruto, true],
    ['(−) Comisiones medios de pago', eerr.comisiones, null, false],
    [`(−) ${cfg.ventasTaxLabel}`, eerr.iibb, null, false],
    ['(−) Costo financiero', eerr.financiero, null, false],
    ['MARGEN DE CONTRIBUCIÓN', eerr.margenContribucion, eerr.pct.margenContribucion, true],
    ['(−) Costos fijos de estructura', eerr.costosFijos, eerr.pct.costosFijos, false],
    ['RESULTADO OPERATIVO', eerr.resultadoOperativo, eerr.pct.resultadoOperativo, true],
    ['(−) Impuesto a las ganancias estimado', eerr.impuestoGanancias, null, false],
    ['RESULTADO NETO', eerr.resultadoNeto, eerr.pct.resultadoNeto, true],
  ];
  return (
    <div>
      <h2>Estado de resultados</h2>
      <p className="desc">Tu EERR mensual y anualizado, con % sobre ventas por línea.</p>
      <div className="inline-flds" style={{ marginBottom: 18 }}>
        <div>
          <label className="fld">Tasa de impuesto a las ganancias (%)</label>
          <input className="inp" style={{ width: 120 }} value={(s.tasaGanancias * 100).toFixed(1)} onChange={(e) => set({ ...s, tasaGanancias: pctIn(e.target.value) })} />
          <p className="help">{cfg.gananciasAyuda}</p>
        </div>
      </div>
      <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>Concepto</th><th className="r">$ / mes</th><th className="r">% s/ventas</th><th className="r">$ / año</th></tr></thead>
          <tbody>
            {filas.map(([lbl, v, pct, bold]) => (
              <tr key={lbl}>
                <td className={bold ? 'b' : ''}>{lbl}</td>
                <td className={`r num ${bold ? 'b' : ''}`} style={v < 0 ? { color: 'var(--red)' } : undefined}>{fmtMoney(v, P)}</td>
                <td className="r num">{pct === null ? '' : fmtPct(pct, P)}</td>
                <td className="r num">{fmtMoney(v * 12, P)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================== SIMULADOR ==============================
export function ModSimulador({ s }: { s: AppState }) {
  const P = s.pais;
  const [dP, setDP] = useState(0.05);
  const [dV, setDV] = useState(0);
  const [dC, setDC] = useState(0);
  const sim = useMemo(() => simular(toInputs(s), dP, dV, dC), [s, dP, dV, dC]);
  const preciosEjes = [-0.1, -0.05, 0, 0.05, 0.1];
  const volEjes = [-0.2, -0.1, 0, 0.1, 0.2];
  return (
    <div>
      <h2>Simulador: ¿y si…?</h2>
      <p className="desc">Movés precios, volumen o costos y ves el impacto inmediato en tu resultado, antes de decidir.</p>
      <div className="card">
        <div className="inline-flds">
          <div><label className="fld">Δ Precios (%)</label><input className="inp" style={{ width: 110 }} value={(dP * 100).toFixed(1)} onChange={(e) => setDP(pctIn(e.target.value))} /></div>
          <div><label className="fld">Δ Volumen (%)</label><input className="inp" style={{ width: 110 }} value={(dV * 100).toFixed(1)} onChange={(e) => setDV(pctIn(e.target.value))} /></div>
          <div><label className="fld">Δ Costos variables (%)</label><input className="inp" style={{ width: 110 }} value={(dC * 100).toFixed(1)} onChange={(e) => setDC(pctIn(e.target.value))} /></div>
        </div>
        <div className="tbl-scroll" style={{ marginTop: 18 }}>
          <table className="tbl">
            <thead><tr><th>Concepto</th><th className="r">Hoy</th><th className="r">Simulado</th><th className="r">Diferencia</th></tr></thead>
            <tbody>
              <tr><td>Facturación</td><td className="r num">{fmtMoney(sim.base.facturacion, P)}</td><td className="r num">{fmtMoney(sim.simulado.facturacion, P)}</td><td className="r num">{fmtMoney(sim.simulado.facturacion - sim.base.facturacion, P)}</td></tr>
              <tr><td>Contribución</td><td className="r num">{fmtMoney(sim.base.contribucion, P)}</td><td className="r num">{fmtMoney(sim.simulado.contribucion, P)}</td><td className="r num">{fmtMoney(sim.simulado.contribucion - sim.base.contribucion, P)}</td></tr>
              <tr><td className="b">RESULTADO</td><td className="r num b">{fmtMoney(sim.base.resultado, P)}</td><td className="r num b" style={sim.simulado.resultado < 0 ? { color: 'var(--red)' } : { color: 'var(--green)' }}>{fmtMoney(sim.simulado.resultado, P)}</td><td className="r num b">{fmtMoney(sim.deltaResultado, P)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="banner info" style={{ marginTop: 16 }}>
          Con precios {fmtPct(dP, P)} y volumen {fmtPct(dV, P)}, tu resultado cambia <b>{fmtMoney(sim.deltaResultado, P)}</b> por mes.
        </div>
      </div>
      <div className="card">
        <h3>Matriz de sensibilidad: resultado operativo (precio × volumen)</h3>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Precio ↓ / Volumen →</th>{volEjes.map((v) => (<th key={v} className="r">{fmtPct(v, P, 0)}</th>))}</tr></thead>
            <tbody>
              {preciosEjes.map((dp) => (
                <tr key={dp}>
                  <td className="b">{fmtPct(dp, P, 0)}</td>
                  {volEjes.map((dv) => {
                    const r = simular(toInputs(s), dp, dv).simulado.resultado;
                    return <td key={dv} className="r num" style={{ color: r < 0 ? 'var(--red)' : 'var(--green)', fontWeight: dp === 0 && dv === 0 ? 700 : 400 }}>{fmtMoney(r, P)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================== DESCUENTOS ==============================
export function ModDescuentos({ s }: { s: AppState }) {
  const P = s.pais;
  const { totales } = useMemo(() => calcMargenes(toInputs(s)), [s]);
  const [dto, setDto] = useState(0.1);
  const uno = useMemo(() => calcDescuento(totales.margenPonderado, dto), [totales, dto]);
  const tabla = useMemo(() => tablaDescuentos(toInputs(s)), [s]);
  return (
    <div>
      <h2>¿Hago descuento para vender más?</h2>
      <p className="desc">
        Un descuento sale de tu margen, no de tu precio. Acá ves cuánto volumen EXTRA necesitás para que el
        descuento no te haga perder plata.
      </p>
      <div className="card">
        <div className="inline-flds">
          <div><label className="fld">Descuento que pensás hacer (%)</label><input className="inp" style={{ width: 120 }} value={(dto * 100).toFixed(1)} onChange={(e) => setDto(pctIn(e.target.value))} /></div>
          <div className="kpi" style={{ minWidth: 260 }}>
            <div className="lbl">Volumen extra necesario</div>
            <div className="val num" style={uno.volumenExtraNecesario === null ? { color: 'var(--red)' } : undefined}>
              {uno.volumenExtraNecesario === null ? 'IMPOSIBLE' : `+${fmtPct(uno.volumenExtraNecesario, P)}`}
            </div>
          </div>
        </div>
        <div className={`banner ${uno.volumenExtraNecesario === null ? 'danger' : 'warn'}`} style={{ marginTop: 16 }}>
          {uno.volumenExtraNecesario === null
            ? `Un ${fmtPct(dto, P, 0)} de descuento se come TODO tu margen (${fmtPct(totales.margenPonderado, P)}). A ese precio, cada venta destruye valor.`
            : `Para que un ${fmtPct(dto, P, 0)} de descuento se pague solo, tenés que vender ${fmtPct(uno.volumenExtraNecesario, P, 0)} más unidades. ¿De verdad ese descuento te va a traer tanta venta extra?`}
        </div>
      </div>
      <div className="card">
        <h3>Tabla de referencia (con tu margen ponderado de {fmtPct(totales.margenPonderado, P)})</h3>
        <table className="tbl">
          <thead><tr><th>Descuento</th><th className="r">Volumen extra necesario</th><th className="r">% de tu margen que se lleva</th></tr></thead>
          <tbody>
            {tabla.map((d) => (
              <tr key={d.descuento}>
                <td className="b">{fmtPct(d.descuento, P, 0)}</td>
                <td className="r num">{d.volumenExtraNecesario === null ? 'Imposible' : `+${fmtPct(d.volumenExtraNecesario, P)}`}</td>
                <td className="r num">{fmtPct(d.pesoSobreMargen, P)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================== CAJA ==============================
export function ModCaja({ s, set }: Props) {
  const P = s.pais;
  const caja = useMemo(() => calcCaja(toInputs(s)), [s]);
  return (
    <div>
      <h2>Ciclo de caja: ¿cuánto tarda tu plata en volver?</h2>
      <p className="desc">Comprás y pagás sueldos hoy; cobrás dentro de semanas o meses. Este es el costo silencioso de la liquidez.</p>
      <div className="kpis">
        <div className="kpi"><div className="lbl">Días de stock</div><div className="val num">{fmtNum(caja.diasStock, P)}</div></div>
        <div className="kpi"><div className="lbl">+ Días de cobro</div><div className="val num">{fmtNum(caja.diasCobro, P, 1)}</div></div>
        <div className="kpi"><div className="lbl">− Días de pago</div><div className="val num">{fmtNum(caja.diasPago, P)}</div></div>
        <div className={`kpi ${caja.cicloCaja > 90 ? 'neg' : ''}`}><div className="lbl">Ciclo de caja total (días)</div><div className="val num">{fmtNum(caja.cicloCaja, P, 1)}</div></div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Plata inmovilizada (mensualizada; cobros/pagos con IVA, stock a costo)</h3>
        <table className="tbl">
          <tbody>
            <tr><td>Costo de mercadería vendida / mes (CMV)</td><td className="r num">{fmtMoney(caja.cmvMensual, P)}</td></tr>
            <tr><td>Plata atrapada en STOCK</td><td className="r num">{fmtMoney(caja.plataEnStock, P)}</td></tr>
            <tr><td>Plata en la calle (cuentas por cobrar, con IVA)</td><td className="r num">{fmtMoney(caja.plataEnLaCalle, P)}</td></tr>
            <tr><td>Financiación de proveedores (te la prestan ellos)</td><td className="r num" style={{ color: 'var(--green)' }}>{fmtMoney(caja.financiacionProveedores, P)}</td></tr>
            <tr><td className="b">CAPITAL DE TRABAJO NETO NECESARIO</td><td className="r num b">{fmtMoney(caja.capitalTrabajo, P)}</td></tr>
            <tr><td>% del capital atrapado en stock</td><td className="r num">{fmtPct(caja.pctAtrapadoEnStock, P)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Costo de financiar ese capital</h3>
        <div className="inline-flds">
          <div>
            <label className="fld">Tasa MENSUAL a la que financiás (%)</label>
            <input className="inp" style={{ width: 120 }} value={(s.tasaFinanciacionMensual * 100).toFixed(1)} onChange={(e) => set({ ...s, tasaFinanciacionMensual: pctIn(e.target.value) })} />
          </div>
          <div className="kpi" style={{ minWidth: 280 }}>
            <div className="lbl">Costo financiero anual estimado</div>
            <div className="val num" style={{ color: 'var(--red)' }}>{fmtMoney(caja.costoFinancieroAnual(s.tasaFinanciacionMensual), P)}</div>
          </div>
        </div>
        <p className="help" style={{ marginTop: 12 }}>
          Achicar días de stock o de cobro libera plata sin vender un peso más.
        </p>
      </div>
    </div>
  );
}

// ============================== MATRIZ ==============================
export function ModMatriz({ s }: { s: AppState }) {
  const P = s.pais;
  const matriz = useMemo(() => calcMatriz(toInputs(s)), [s]);
  const meta: Record<string, [string, string, string]> = {
    estrella: ['⭐ Estrella', 'verde', 'Defendé precio y disponibilidad. No la remates jamás.'],
    joya: ['💎 Joya', 'azul', 'Alto margen, poco volumen: empujala con marketing y mix.'],
    motor: ['🐄 Motor ajustado', 'amarillo', 'Mueve caja pero deja poco: revisá precio, costo o negociá volumen.'],
    revisar: ['🐕 A revisar', 'rojo', 'Poco margen y poco volumen: subí precio, bajá costo o discontinuá.'],
  };
  return (
    <div>
      <h2>Matriz de productos: margen × facturación</h2>
      <p className="desc">Tus productos en 4 cuadrantes para diagnosticar el mix de un vistazo.</p>
      <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>Producto</th><th className="r">Facturación</th><th className="r">Margen real</th><th>Cuadrante</th><th>Qué hacer</th></tr></thead>
          <tbody>
            {matriz.map((m) => (
              <tr key={m.nombre}>
                <td className="b">{m.nombre}</td>
                <td className="r num">{fmtMoney(m.facturacion, P)}</td>
                <td className="r num">{fmtPct(m.margenReal, P)}</td>
                <td><span className={`tag ${meta[m.cuadrante][1]}`}>{meta[m.cuadrante][0]}</span></td>
                <td style={{ whiteSpace: 'normal', maxWidth: 360, fontSize: 12.5 }}>{meta[m.cuadrante][2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================== FORECAST ==============================
export function ModForecast({ s, set }: Props) {
  const P = s.pais;
  const fc = useMemo(() => calcForecast(toInputs(s), s.forecast.crecVentas, s.forecast.inflCostos, s.forecast.ajustePrecios), [s]);
  const m12 = fc[11];
  return (
    <div>
      <h2>Forecast a 12 meses</h2>
      <p className="desc">
        Qué pasa con tu resultado si los costos inflacionan más rápido de lo que ajustás los precios. La
        erosión de margen es silenciosa.
      </p>
      <div className="card">
        <div className="inline-flds">
          <div><label className="fld">Crecimiento nominal de ventas / mes (%)</label><input className="inp" style={{ width: 110 }} value={(s.forecast.crecVentas * 100).toFixed(1)} onChange={(e) => set({ ...s, forecast: { ...s.forecast, crecVentas: pctIn(e.target.value) } })} /></div>
          <div><label className="fld">Inflación de costos / mes (%)</label><input className="inp" style={{ width: 110 }} value={(s.forecast.inflCostos * 100).toFixed(1)} onChange={(e) => set({ ...s, forecast: { ...s.forecast, inflCostos: pctIn(e.target.value) } })} /></div>
          <div><label className="fld">Ajuste de TUS precios / mes (%)</label><input className="inp" style={{ width: 110 }} value={(s.forecast.ajustePrecios * 100).toFixed(1)} onChange={(e) => set({ ...s, forecast: { ...s.forecast, ajustePrecios: pctIn(e.target.value) } })} /></div>
        </div>
      </div>
      <div className={`banner ${m12.resultado < 0 ? 'danger' : 'info'}`}>
        {m12.resultado < 0
          ? <>⚠ Con estos supuestos, en el mes 12 tu resultado es <b>{fmtMoney(m12.resultado, P)}</b>: la inflación de costos te come el margen. Ajustá precios más seguido o bajá estructura.</>
          : <>Con estos supuestos, en el mes 12 tu resultado es <b>{fmtMoney(m12.resultado, P)}</b> y acumulás <b>{fmtMoney(m12.acumulado, P)}</b> en el año.</>}
      </div>
      <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>Mes</th><th className="r">Ventas</th><th className="r">Margen %</th><th className="r">Contribución</th><th className="r">Fijos (inflados)</th><th className="r">Resultado</th><th className="r">Acumulado</th></tr></thead>
          <tbody>
            {fc.map((m) => (
              <tr key={m.mes}>
                <td className="b">Mes {m.mes}</td>
                <td className="r num">{fmtMoney(m.ventas, P)}</td>
                <td className="r num">{fmtPct(m.margenContribucionPct, P)}</td>
                <td className="r num">{fmtMoney(m.contribucion, P)}</td>
                <td className="r num">{fmtMoney(m.costosFijos, P)}</td>
                <td className="r num" style={{ color: m.resultado < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{fmtMoney(m.resultado, P)}</td>
                <td className="r num">{fmtMoney(m.acumulado, P)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================== PRÓXIMAMENTE (FLUJO / MIX / EVOLUCION) ==============================
export function ModProximamente({ titulo }: { titulo: string }) {
  return (
    <div>
      <h2>{titulo}</h2>
      <div className="banner info" style={{ marginTop: 12 }}>
        Este módulo está en construcción y llega en la próxima actualización de tu suscripción, sin costo extra.
      </div>
    </div>
  );
}
