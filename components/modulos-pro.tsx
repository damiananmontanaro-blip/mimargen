'use client';
/**
 * MI MARGEN — Módulos PRO: FLUJO (7), MIX (8), EVOLUCION (9)
 * Auditoría teórica financiera/contable/controller aplicada en cada módulo.
 */
import { useMemo, useState } from 'react';
import {
  calcFlujo, calcMix, calcEvolucion,
  FlujoConfig, MedioCobro, MesReal, mesRealVacio, mesRealDesdeInputs,
  flujoConfigDefault,
} from '@/lib/calc';
import { AppState } from '@/lib/store';
import { fmtMoney, fmtPct, fmtNum, PAISES } from '@/lib/country';

type Props = { s: AppState; set: (s: AppState) => void };

const num = (v: string | number): number => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const pctIn = (v: string): number => num(v) / 100;

function toInputs(s: AppState) {
  return { params: s.params, costosFijos: s.fijos.reduce((t, f) => t + f.monto, 0), productos: s.productos };
}

// ============================== FLUJO (Módulo 7) ==============================
export function ModFlujo({ s, set }: Props) {
  const P = s.pais;
  const inp = toInputs(s);

  const [cfg, setCfg] = useState<FlujoConfig>(() => flujoConfigDefault(inp));

  const flujo = useMemo(() => {
    try { return calcFlujo(inp, cfg); } catch { return []; }
  }, [s, cfg]);

  const sumaMedios = cfg.mediosCobro.reduce((t, m) => t + m.pct, 0);
  const pctOk = Math.abs(sumaMedios - 1) < 0.01;

  const setMedio = (i: number, campo: keyof MedioCobro, valor: number | string) => {
    const medios = cfg.mediosCobro.map((m, j) =>
      j === i ? { ...m, [campo]: typeof valor === 'string' ? num(valor) : valor } : m
    );
    setCfg({ ...cfg, mediosCobro: medios });
  };

  const saldoMin = Math.min(...flujo.map(m => m.saldoFinal));
  const mesesNeg = flujo.filter(m => m.alertaLiquidez).length;

  return (
    <div>
      <h2>Flujo de fondos a 12 meses</h2>
      <p className="desc">
        Proyección de caja en base <b>percibida</b> (cuándo entra y sale la plata de verdad).
        Diferente al EERR (devengado) y al FORECAST (que trabaja con margen, no con timing de cobros).
      </p>

      <div className="banner info">
        <b>Diferencia clave:</b> El EERR muestra cuánto <i>ganás</i>. El FLUJO muestra cuándo <i>tenés la plata</i>.
        Podés ser rentable y quedarte sin caja si cobrás tarde y pagás temprano.
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>A · Mix de medios de cobro</h3>
        <p className="help" style={{ marginBottom: 14 }}>
          ¿Cómo te pagan tus clientes? Los % deben sumar 100%. Días de cobro = días hasta que el
          dinero llega a tu cuenta (tarjeta crédito ~18 días, QR ~2 días, cheque a 30 días = 30 días).
        </p>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Medio de cobro</th>
                <th className="r">% del total</th>
                <th className="r">Días hasta cobrar</th>
                <th className="r">Comisión extra (%)</th>
              </tr>
            </thead>
            <tbody>
              {cfg.mediosCobro.map((m, i) => (
                <tr key={i}>
                  <td>
                    <input className="tbl input wide" value={m.nombre}
                      onChange={e => setMedio(i, 'nombre', e.target.value)} />
                  </td>
                  <td className="r">
                    <input value={(m.pct * 100).toFixed(0)}
                      onChange={e => setMedio(i, 'pct', pctIn(e.target.value))} />
                  </td>
                  <td className="r">
                    <input value={m.diasCobro}
                      onChange={e => setMedio(i, 'diasCobro', num(e.target.value))} />
                  </td>
                  <td className="r">
                    <input value={(m.comisionExtra * 100).toFixed(2)}
                      onChange={e => setMedio(i, 'comisionExtra', pctIn(e.target.value))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!pctOk && (
          <div className="banner danger" style={{ marginTop: 10 }}>
            Los porcentajes suman {(sumaMedios * 100).toFixed(0)}% — deben sumar exactamente 100%.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setCfg({
            ...cfg,
            mediosCobro: [...cfg.mediosCobro, { nombre: 'Nuevo medio', pct: 0, diasCobro: 0, comisionExtra: 0 }]
          })}>+ Agregar medio</button>
          {cfg.mediosCobro.length > 1 && (
            <button className="btn btn-ghost" onClick={() => setCfg({
              ...cfg, mediosCobro: cfg.mediosCobro.slice(0, -1)
            })}>− Quitar último</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>B · Parámetros de caja</h3>
        <div className="inline-flds">
          <div>
            <label className="fld">Saldo inicial de caja (lo que tenés hoy)</label>
            <input className="inp" style={{ width: 180 }} value={cfg.saldoInicial}
              onChange={e => setCfg({ ...cfg, saldoInicial: num(e.target.value) })} />
            <p className="help">Plata disponible en cuenta hoy, de arranque de la proyección.</p>
          </div>
          <div>
            <label className="fld">Saldo mínimo deseado (colchón)</label>
            <input className="inp" style={{ width: 180 }} value={cfg.saldoMinimo}
              onChange={e => setCfg({ ...cfg, saldoMinimo: num(e.target.value) })} />
            <p className="help">El mínimo que querés tener siempre. Recomendado: 1 mes de costos fijos.</p>
          </div>
          <div>
            <label className="fld">Crecimiento ventas / mes (%)</label>
            <input className="inp" style={{ width: 120 }} value={(cfg.crecVentas * 100).toFixed(1)}
              onChange={e => setCfg({ ...cfg, crecVentas: pctIn(e.target.value) })} />
          </div>
          <div>
            <label className="fld">Inflación costos / mes (%)</label>
            <input className="inp" style={{ width: 120 }} value={(cfg.inflCostos * 100).toFixed(1)}
              onChange={e => setCfg({ ...cfg, inflCostos: pctIn(e.target.value) })} />
          </div>
        </div>
      </div>

      {flujo.length > 0 && (
        <>
          <div className="kpis" style={{ marginBottom: 18 }}>
            <div className={`kpi ${saldoMin < 0 ? 'neg' : ''}`}>
              <div className="lbl">Saldo mínimo proyectado</div>
              <div className="val num">{fmtMoney(saldoMin, P)}</div>
            </div>
            <div className={`kpi ${mesesNeg > 0 ? 'neg' : 'pos'}`}>
              <div className="lbl">Meses bajo el colchón mínimo</div>
              <div className="val num">{mesesNeg}</div>
            </div>
            <div className="kpi">
              <div className="lbl">Saldo proyectado mes 12</div>
              <div className="val num">{fmtMoney(flujo[11].saldoFinal, P)}</div>
            </div>
          </div>

          {mesesNeg > 0 && (
            <div className="banner danger" style={{ marginBottom: 18 }}>
              ⚠️ Hay <b>{mesesNeg} mes{mesesNeg > 1 ? 'es' : ''}</b> donde el saldo cae por debajo
              de tu colchón mínimo. Acción: cobrar antes, pagar después, o conseguir financiamiento
              ANTES de que llegue ese mes.
            </div>
          )}

          <div className="card">
            <h3>Proyección mes a mes</h3>
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="r">Ventas devengadas</th>
                    <th className="r">Cobranzas efectivas</th>
                    <th className="r">Pago proveedores</th>
                    <th className="r">Costos fijos</th>
                    <th className="r">Flujo neto</th>
                    <th className="r">Saldo final</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {flujo.map(m => (
                    <tr key={m.mes}>
                      <td className="b">Mes {m.mes}</td>
                      <td className="r num">{fmtMoney(m.ventasDevengadas, P)}</td>
                      <td className="r num">{fmtMoney(m.cobranzasEfectivas, P)}</td>
                      <td className="r num" style={{ color: 'var(--red)' }}>{fmtMoney(-m.pagoProveedores, P)}</td>
                      <td className="r num" style={{ color: 'var(--red)' }}>{fmtMoney(-m.pagoFijos, P)}</td>
                      <td className="r num b" style={{ color: m.flujoBruto < 0 ? 'var(--red)' : 'var(--green)' }}>
                        {fmtMoney(m.flujoBruto, P)}
                      </td>
                      <td className="r num b" style={{ color: m.saldoFinal < cfg.saldoMinimo ? 'var(--red)' : 'var(--ink)' }}>
                        {fmtMoney(m.saldoFinal, P)}
                      </td>
                      <td>
                        {m.alertaLiquidez
                          ? <span className="tag rojo">⚠ Bajo mínimo</span>
                          : <span className="tag verde">✔ OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="help" style={{ marginTop: 16 }}>
        Nota metodológica: los pagos a proveedores usan el CMV ajustado por inflación con el delay
        de días de pago configurado en DATOS. Las cobranzas aplican el delay por medio en meses
        enteros (ceil). Para mayor precisión, ajustá los días de cobro de cada medio con tus datos reales.
      </p>
    </div>
  );
}

// ============================== MIX (Módulo 8) ==============================
export function ModMix({ s }: { s: AppState }) {
  const P = s.pais;
  const inp = toInputs(s);

  const [uProp, setUProp] = useState<number[]>(s.productos.map(p => p.unidades));

  const mix = useMemo(() => {
    try { return calcMix(inp, uProp); } catch { return null; }
  }, [s, uProp]);

  if (!mix) return <div className="banner warn">Cargá productos en DATOS para usar este módulo.</div>;

  return (
    <div>
      <h2>Mix de productos: ¿qué pasa si vendo diferente?</h2>
      <p className="desc">
        El mix óptimo no es el que más factura: es el que maximiza la <b>contribución total</b>.
        Un producto más barato con mejor margen unitario puede ser más rentable que uno caro con
        margen flaco.
      </p>

      <div className="banner info">
        <b>Cómo usarlo:</b> Ajustá las unidades "propuestas" de cada producto y ve cómo cambia
        tu resultado. Usalo para decidir dónde enfocar ventas, publicidad o esfuerzo de producción.
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Ajustá el mix propuesto</h3>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">Contribución unitaria</th>
                <th className="r">Unidades actuales</th>
                <th className="r">Contribución actual</th>
                <th className="r">Unidades propuestas</th>
                <th className="r">Contribución propuesta</th>
                <th className="r">Δ Contribución</th>
                <th className="r">% Mix actual</th>
                <th className="r">% Mix propuesto</th>
              </tr>
            </thead>
            <tbody>
              {mix.productos.map((p, i) => (
                <tr key={p.nombre}>
                  <td className="b">{p.nombre}</td>
                  <td className="r num" style={{ color: p.contribucionUnitaria < 0 ? 'var(--red)' : 'var(--green)' }}>
                    {fmtMoney(p.contribucionUnitaria, P)}
                  </td>
                  <td className="r num">{fmtNum(p.unidadesActual, P)}</td>
                  <td className="r num">{fmtMoney(p.contribucionActual, P)}</td>
                  <td className="r">
                    <input
                      value={uProp[i]}
                      onChange={e => {
                        const nuevo = [...uProp];
                        nuevo[i] = num(e.target.value);
                        setUProp(nuevo);
                      }}
                    />
                  </td>
                  <td className="r num">{fmtMoney(p.contribucionPropuesta, P)}</td>
                  <td className="r num b" style={{ color: p.deltaContribucion >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {p.deltaContribucion >= 0 ? '+' : ''}{fmtMoney(p.deltaContribucion, P)}
                  </td>
                  <td className="r num">{fmtPct(p.pctMixActual, P)}</td>
                  <td className="r num">{fmtPct(p.pctMixPropuesto, P)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 12 }}
          onClick={() => setUProp(s.productos.map(p => p.unidades))}>
          ↺ Resetear al mix actual
        </button>
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <div className="kpi"><div className="lbl">Facturación actual</div><div className="val num">{fmtMoney(mix.facturacionActual, P)}</div></div>
        <div className="kpi"><div className="lbl">Facturación propuesta</div><div className="val num">{fmtMoney(mix.facturacionPropuesta, P)}</div></div>
        <div className="kpi"><div className="lbl">Margen actual</div><div className="val num">{fmtPct(mix.margenActual, P)}</div></div>
        <div className="kpi"><div className="lbl">Margen propuesto</div><div className="val num">{fmtPct(mix.margenPropuesto, P)}</div></div>
        <div className={`kpi ${mix.resultadoActual < 0 ? 'neg' : 'pos'}`}>
          <div className="lbl">Resultado actual</div><div className="val num">{fmtMoney(mix.resultadoActual, P)}</div>
        </div>
        <div className={`kpi ${mix.resultadoPropuesto < 0 ? 'neg' : 'pos'}`}>
          <div className="lbl">Resultado propuesto</div><div className="val num">{fmtMoney(mix.resultadoPropuesto, P)}</div>
        </div>
        <div className={`kpi ${mix.deltaResultado >= 0 ? 'pos' : 'neg'}`}>
          <div className="lbl">Δ Resultado</div>
          <div className="val num">{mix.deltaResultado >= 0 ? '+' : ''}{fmtMoney(mix.deltaResultado, P)}</div>
        </div>
      </div>

      <div className={`banner ${mix.deltaResultado >= 0 ? 'info' : 'warn'}`} style={{ marginTop: 16 }}>
        {mix.recomendacion}
      </div>

      <p className="help" style={{ marginTop: 14 }}>
        Regla del controller: si tenés capacidad limitada (horas, espacio, máquina), priorizá
        los productos con mayor <b>contribución por unidad de restricción</b> (ej: contribución
        por hora de trabajo o por metro cuadrado). Acá el análisis es por unidad vendida, sin
        restricción de capacidad.
      </p>
    </div>
  );
}

// ============================== EVOLUCION (Módulo 9) ==============================
const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function ModEvolucion({ s }: { s: AppState }) {
  const P = s.pais;
  const inp = toInputs(s);
  const anioActual = new Date().getFullYear();

  // Inicializar 12 meses: el mes actual precargado con los datos del Excel, el resto vacío
  const mesActual = new Date().getMonth() + 1;
  const [meses, setMeses] = useState<MesReal[]>(() =>
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      if (m === mesActual) return mesRealDesdeInputs(inp, m, anioActual);
      return mesVacioConEtiqueta(m, anioActual);
    })
  );

  const analisis = useMemo(() => calcEvolucion(meses), [meses]);

  const setMes = (i: number, campo: keyof MesReal, valor: number | string) => {
    const nuevo = [...meses];
    const m = { ...nuevo[i], [campo]: num(String(valor)) };
    // Recalcular contribución y margen automáticamente
    m.contribucion = m.ventas - m.costoVariable;
    m.resultado = m.contribucion - m.costosFijos;
    m.margenPct = m.ventas > 0 ? m.contribucion / m.ventas : 0;
    nuevo[i] = m;
    setMeses(nuevo);
  };

  const tendenciaLabel = (t: string) => ({
    mejora: '📈 Mejorando',
    deterioro: '📉 Deterioro',
    estable: '➡ Estable',
    insuficiente_data: '— Pocos datos',
  }[t] ?? '—');

  const tendenciaColor = (t: string) => ({
    mejora: 'var(--green)',
    deterioro: 'var(--red)',
    estable: 'var(--soft)',
    insuficiente_data: 'var(--soft)',
  }[t] ?? 'var(--soft)');

  return (
    <div>
      <h2>Evolución mensual: ¿cómo viene el negocio?</h2>
      <p className="desc">
        Registrá los números reales de cada mes para ver la tendencia. El mes actual viene
        precargado con tus datos de DATOS — pisalo con los valores reales cuando los tengas.
      </p>

      <div className="banner info">
        <b>Diferencia con FORECAST:</b> FORECAST proyecta lo que <i>va a pasar</i> según supuestos.
        EVOLUCIÓN registra lo que <i>pasó</i>. Comparar ambos te dice si tu negocio está siguiendo
        el plan o desviándose.
      </div>

      {analisis.alertaDeterioroMargen && (
        <div className="banner danger" style={{ marginTop: 14 }}>
          🚨 <b>Alerta:</b> El margen viene cayendo 3 meses seguidos. Señal de deterioro estructural —
          revisá precios, costos y mix urgente.
        </div>
      )}

      {analisis.meses.filter(m => m.ventas > 0).length >= 2 && (
        <div className="kpis" style={{ marginTop: 16 }}>
          <div className="kpi">
            <div className="lbl">Ventas promedio / mes</div>
            <div className="val num">{fmtMoney(analisis.promedioVentas, P)}</div>
          </div>
          <div className="kpi">
            <div className="lbl">Margen promedio</div>
            <div className="val num">{fmtPct(analisis.promedioMargen, P)}</div>
          </div>
          <div className={`kpi ${analisis.promedioResultado < 0 ? 'neg' : 'pos'}`}>
            <div className="lbl">Resultado promedio / mes</div>
            <div className="val num">{fmtMoney(analisis.promedioResultado, P)}</div>
          </div>
          <div className="kpi">
            <div className="lbl">Tendencia de margen</div>
            <div className="val" style={{ color: tendenciaColor(analisis.tendenciaMargen), fontSize: 16 }}>
              {tendenciaLabel(analisis.tendenciaMargen)}
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">Tendencia de resultado</div>
            <div className="val" style={{ color: tendenciaColor(analisis.tendenciaResultado), fontSize: 16 }}>
              {tendenciaLabel(analisis.tendenciaResultado)}
            </div>
          </div>
          {analisis.mejorMes && (
            <div className="kpi pos">
              <div className="lbl">Mejor mes</div>
              <div className="val">{analisis.mejorMes.etiqueta} ({fmtMoney(analisis.mejorMes.resultado, P)})</div>
            </div>
          )}
          {analisis.peorMes && (
            <div className="kpi neg">
              <div className="lbl">Peor mes</div>
              <div className="val">{analisis.peorMes.etiqueta} ({fmtMoney(analisis.peorMes.resultado, P)})</div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Cargá los datos reales mes a mes</h3>
        <p className="help" style={{ marginBottom: 14 }}>
          Ingresá Ventas, Costo Variable y Costos Fijos. La Contribución, el Margen y el
          Resultado se calculan solos. Dejá en 0 los meses que todavía no pasaron.
        </p>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="r">Ventas (sin IVA)</th>
                <th className="r">Costo Variable</th>
                <th className="r">Costos Fijos</th>
                <th className="r">Contribución</th>
                <th className="r">Margen %</th>
                <th className="r">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m, i) => (
                <tr key={i} style={{ opacity: m.ventas === 0 ? 0.5 : 1 }}>
                  <td className="b">{m.etiqueta}</td>
                  <td className="r">
                    <input value={m.ventas || ''}
                      placeholder="0"
                      onChange={e => setMes(i, 'ventas', e.target.value)} />
                  </td>
                  <td className="r">
                    <input value={m.costoVariable || ''}
                      placeholder="0"
                      onChange={e => setMes(i, 'costoVariable', e.target.value)} />
                  </td>
                  <td className="r">
                    <input value={m.costosFijos || ''}
                      placeholder="0"
                      onChange={e => setMes(i, 'costosFijos', e.target.value)} />
                  </td>
                  <td className="r num" style={{ color: m.contribucion < 0 ? 'var(--red)' : 'var(--ink)' }}>
                    {m.ventas > 0 ? fmtMoney(m.contribucion, P) : '—'}
                  </td>
                  <td className="r num">
                    {m.ventas > 0 ? fmtPct(m.margenPct, P) : '—'}
                  </td>
                  <td className="r num b" style={{ color: m.resultado < 0 ? 'var(--red)' : 'var(--green)' }}>
                    {m.ventas > 0 ? fmtMoney(m.resultado, P) : '—'}
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

// Helper local
function mesVacioConEtiqueta(mes: number, anio: number): MesReal {
  return {
    mes, etiqueta: `${MESES_LABELS[(mes - 1) % 12]} ${anio}`,
    ventas: 0, costoVariable: 0, costosFijos: 0,
    contribucion: 0, margenPct: 0, resultado: 0,
  };
}
