'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { PAISES, Pais } from '@/lib/country';

export default function Registro() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pais, setPais] = useState<Pais>('AR');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!supabaseConfigurado || !supabase) {
      router.push('/app');
      return;
    }
    if (pass.length < 8) {
      setErr('La contraseña necesita al menos 8 caracteres.');
      return;
    }
    setCargando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { pais } }, // el trigger de la base lo copia a profiles
    });
    setCargando(false);
    if (error) {
      setErr(error.message.includes('already registered') ? 'Ese email ya tiene cuenta. Probá ingresar.' : error.message);
      return;
    }
    if (data.session) {
      router.push('/app'); // confirmación de email desactivada: entra directo
    } else {
      setOk(true); // requiere confirmar email
    }
  }

  return (
    <div className="auth-box">
      <span className="brand">Mi<em>Margen</em></span>
      <h1 style={{ marginTop: 18 }}>Creá tu cuenta</h1>
      <p className="sub">3 días gratis con todos los módulos. Sin tarjeta.</p>
      {ok ? (
        <div className="msg-ok">
          ¡Listo! Te mandamos un email para confirmar la cuenta. Confirmalo y después <Link href="/login">ingresá acá</Link>.
        </div>
      ) : (
        <form onSubmit={crear}>
          <label className="fld">País de tu negocio</label>
          <select className="inp" value={pais} onChange={(e) => setPais(e.target.value as Pais)}>
            {(Object.keys(PAISES) as Pais[]).map((p) => (
              <option key={p} value={p}>
                {PAISES[p].bandera} {PAISES[p].nombre} — {PAISES[p].ivaLabel}, {PAISES[p].ventasTaxLabel}
              </option>
            ))}
          </select>
          <label className="fld">Email</label>
          <input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="fld">Contraseña (mínimo 8)</label>
          <input className="inp" type="password" required value={pass} onChange={(e) => setPass(e.target.value)} />
          {err && <div className="msg-err">{err}</div>}
          <button className="btn btn-blue" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={cargando}>
            {cargando ? 'Creando cuenta…' : 'Empezar mis 3 días gratis'}
          </button>
        </form>
      )}
      <p style={{ fontSize: 13.5, marginTop: 16, textAlign: 'center' }}>
        ¿Ya tenés cuenta? <Link href="/login">Ingresar</Link>
      </p>
    </div>
  );
}
