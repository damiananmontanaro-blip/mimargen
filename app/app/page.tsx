'use client';
/**
 * MI MARGEN — App principal (el "Excel" en la web).
 * Gate de acceso: demo (sin Supabase) / trial 3 días / suscripción activa / vencido.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppState, estadoInicial, cargarLocal, guardarLocal, guardarNube, cargarNube } from '@/lib/store';
import { obtenerAcceso, Acceso, checkoutUrl } from '@/lib/plan';
import { supabase } from '@/lib/supabase';
import { PAISES, Pais } from '@/lib/country';
import {
  ModDatos, ModDashboard, ModAlertas, ModPrecios, ModMargenes, ModResultados,
  ModSimulador, ModDescuentos, ModCaja, ModMatriz, ModForecast,
} from '@/components/modulos';
import { ModFlujo, ModMix, ModEvolucion } from '@/components/modulos-pro';

const TABS = [
  'DATOS', 'DASHBOARD', 'ALERTAS', 'PRECIOS', 'MARGENES', 'RESULTADOS',
  'SIMULADOR', 'DESCUENTOS', 'CAJA', 'MATRIZ', 'FORECAST', 'FLUJO', 'MIX', 'EVOLUCION',
] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const router = useRouter();
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [s, setS] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('DATOS');
  const guardadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const a = await obtenerAcceso();
      if (a.tipo === 'anonimo') { router.replace('/login'); return; }
      setAcceso(a);
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);
        setEmail(user?.email ?? null);
      }
      const pais: Pais = a.tipo === 'demo' ? 'AR' : a.pais;
      const nube = a.tipo !== 'demo' ? await cargarNube() : null;
      setS(nube ?? cargarLocal() ?? estadoInicial(pais));
    })();
  }, [router]);

  const set = useCallback((nuevo: AppState) => {
    setS(nuevo);
    guardarLocal(nuevo);
    if (guardadoTimer.current) clearTimeout(guardadoTimer.current);
    guardadoTimer.current = setTimeout(() => { void guardarNube(nuevo); }, 1500);
  }, []);

  async function salir() {
    if (supabase) await supabase.auth.signOut();
    router.push('/');
  }

  if (!acceso || !s) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: 'var(--soft)' }}>Cargando tu tablero…</div>;
  }

  if (acceso.tipo === 'vencido') {
    return (
      <div className="paywall">
        <span className="brand" style={{ fontSize: 22 }}>Mi<em>Margen</em></span>
        <h1 style={{ margin: '20px 0 10px' }}>Tu prueba de 3 días terminó</h1>
        <p style={{ marginBottom: 24 }}>
          Tus datos están guardados y te esperan. Activá la suscripción para seguir usando todos los módulos.
        </p>
        <a className="btn btn-blue" style={{ fontSize: 16 }} href={userId ? checkoutUrl(userId, email) : '#'}>
          Suscribirme — USD 14,99/mes
        </a>
        <p style={{ marginTop: 18, fontSize: 13.5 }}>
          <button className="tab" onClick={salir}>Cerrar sesión</button>
        </p>
      </div>
    );
  }

  const cfg = PAISES[s.pais];
  const cambiarPais = (p: Pais) => {
    if (p === s.pais) return;
    const base = estadoInicial(p);
    set({ ...base, fijos: s.fijos, productos: s.productos });
  };

  return (
    <div>
      <div className="appbar">
        <span className="brand">Mi<em>Margen</em></span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {acceso.tipo === 'demo' && <span className="tag azul">Modo demo — datos en este navegador</span>}
          {acceso.tipo === 'trial' && (
            <span className="tag amarillo">
              Prueba gratis: {acceso.diasRestantes} {acceso.diasRestantes === 1 ? 'día' : 'días'} restantes
            </span>
          )}
          {acceso.tipo === 'trial' && userId && (
            <a className="btn btn-blue" style={{ padding: '7px 14px', fontSize: 13 }} href={checkoutUrl(userId, email)}>Suscribirme</a>
          )}
          <select className="inp" style={{ width: 'auto', padding: '7px 10px', fontSize: 13 }} value={s.pais} onChange={(e) => cambiarPais(e.target.value as Pais)}>
            {(Object.keys(PAISES) as Pais[]).map((p) => (
              <option key={p} value={p}>{PAISES[p].bandera} {PAISES[p].nombre}</option>
            ))}
          </select>
          {acceso.tipo !== 'demo'
            ? <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={salir}>Salir</button>
            : <Link className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} href="/registro">Crear cuenta</Link>}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${t === tab ? 'active' : ''} ${['FLUJO', 'MIX', 'EVOLUCION'].includes(t) ? 'pro' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="panel">
        {tab === 'DATOS' && <ModDatos s={s} set={set} />}
        {tab === 'DASHBOARD' && <ModDashboard s={s} />}
        {tab === 'ALERTAS' && <ModAlertas s={s} />}
        {tab === 'PRECIOS' && <ModPrecios s={s} />}
        {tab === 'MARGENES' && <ModMargenes s={s} />}
        {tab === 'RESULTADOS' && <ModResultados s={s} set={set} />}
        {tab === 'SIMULADOR' && <ModSimulador s={s} />}
        {tab === 'DESCUENTOS' && <ModDescuentos s={s} />}
        {tab === 'CAJA' && <ModCaja s={s} set={set} />}
        {tab === 'MATRIZ' && <ModMatriz s={s} />}
        {tab === 'FORECAST' && <ModForecast s={s} set={set} />}
        {tab === 'FLUJO' && <ModFlujo s={s} set={set} />}
        {tab === 'MIX' && <ModMix s={s} />}
        {tab === 'EVOLUCION' && <ModEvolucion s={s} />}
        <p style={{ marginTop: 48, fontSize: 12.5, color: 'var(--soft)', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          {cfg.bandera} Parámetros de {cfg.nombre} · MiMargen replica el modelo del Analizador de Márgenes y
          Caja para PyMEs. Es una herramienta de gestión: no reemplaza el asesoramiento contable e impositivo
          profesional de tu país.
        </p>
      </div>
    </div>
  );
}
