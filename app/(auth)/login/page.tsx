'use client';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>MiMargen</h1>
      <p>Conocé el margen real de tu negocio</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <a href="/register" style={{ padding: '10px 20px', background: '#000', color: '#fff', textDecoration: 'none' }}>
          Registrarse
        </a>
        <a href="/login" style={{ padding: '10px 20px', background: '#666', color: '#fff', textDecoration: 'none' }}>
          Ingresar
        </a>
      </div>
    </div>
  );
}