'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PAISES, Pais } from '@/lib/country';

export default function Landing() {
  const [pais, setPais] = useState<Pais>('AR');
  const cfg = PAISES[pais];
  return (
    <>
      <nav className="topnav">
        <div className="wrap nav-inner">
          <span className="brand">Mi<em>Margen</em></span>
          <div className="nav-cta">
            <Link href="/login" className="btn btn-ghost">Ingresar</Link>
            <Link href="/registro" className="btn btn-dark">Probar 3 días gratis</Link>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="country-pills">
            {(Object.keys(PAISES) as Pais[]).map((p) => (
              <button key={p} className={`cpill ${p === pais ? 'active' : ''}`} onClick={() => setPais(p)}>
                {PAISES[p].bandera} {PAISES[p].nombre}
              </button>
            ))}
          </div>
          <h1>Vendés todos los días. ¿Sabés cuánto te queda de verdad?</h1>
          <p className="lead">
            El costo × 1,20 <b>no</b> te da 20% de margen. Entre comisiones, {cfg.ventasTaxLabel} y costo
            financiero, tu margen real es otro. MiMargen te muestra el número verdadero y el precio
            correcto, producto por producto.
          </p>
          <Link href="/registro" className="btn btn-blue" style={{ fontSize: 16, padding: '13px 26px' }}>
            Probar 3 días gratis →
          </Link>
          <p style={{ fontSize: 13, color: 'var(--soft)', marginTop: 12 }}>
            Sin tarjeta para arrancar · Adaptado a {cfg.nombre}: {cfg.ivaLabel}, {cfg.ventasTaxLabel} y comisiones locales
          </p>
        </div>
      </header>

      <section className="section" style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Los 12 módulos de un controller, sin planillas</p>
          <div className="grid3">
            {[
              ['📊 Dashboard', 'Los 12 números que tenés que mirar todos los meses, en una sola pantalla.'],
              ['🚨 Alertas', 'Diagnóstico automático: controles de salud financiera con acciones concretas.'],
              ['💲 Precios', 'El precio correcto para tu margen objetivo (con IVA final) y semáforo por producto.'],
              ['📈 Márgenes', 'Margen que creés vs. margen REAL, y cuánto subir precio o bajar costo.'],
              ['🧮 Simulador', '¿Subo 5% los precios? ¿Cae el volumen? Impacto inmediato en tu resultado.'],
              ['🏷️ Descuentos', 'Cuánto volumen extra necesitás para que un descuento no te haga perder plata.'],
              ['💵 Caja', 'Cuántos días tarda tu plata en volver y cuánta tenés atrapada en stock.'],
              ['🎯 Matriz', 'Tus productos en 4 cuadrantes (margen × facturación) para diagnosticar el mix.'],
              ['🔮 Forecast', 'Qué pasa en 12 meses si los costos inflacionan más rápido que tus precios.'],
            ].map(([t, d]) => (
              <div className="fcard" key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="price-card">
            <p className="eyebrow">Suscripción MiMargen</p>
            <div className="price">
              USD 14,99 <small>/ mes</small>
            </div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: '10px 0 20px' }}>
              Todos los módulos · Tus datos guardados en la nube · {cfg.bandera} Parámetros de {cfg.nombre} ·
              Cancelás cuando quieras
            </p>
            <Link href="/registro" className="btn btn-blue" style={{ width: '100%', justifyContent: 'center' }}>
              Empezar los 3 días gratis
            </Link>
            <p style={{ fontSize: 12.5, color: 'var(--soft)', marginTop: 14 }}>
              ¿Necesitás ayuda con tus números? Los suscriptores pueden contratar horas de consultoría 1:1.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '28px 0', textAlign: 'center', fontSize: 13, color: 'var(--soft)' }}>
        MiMargen · Desarrollado por Damián Montanaro ·{' '}
        <a href="https://linkedin.com/in/damianmontanaro">LinkedIn</a>
      </footer>
    </>
  );
}
