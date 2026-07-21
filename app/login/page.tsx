'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigurado } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!supabaseConfigurado || !supabase) {
      router.push('/app'); // modo demo
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setCargando(false);
    if (error) {
      setErr(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message === 'Email not confirmed'
            ? 'Tenés que confirmar tu email: revisá tu casilla (y spam).'
            : error.message
      );
      return;
    }
    router.push('/app');
  }

  return (
    <div className="auth-box">
      <span className="brand">Mi<em>Margen</em></span>
      <h1 style={{ marginTop: 18 }}>Ingresar</h1>
      <p className="sub">Accedé a tu tablero de márgenes.</p>
      <form onSubmit={entrar}>
        <label className="fld">Email</label>
        <input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="fld">Contraseña</label>
        <input className="inp" type="password" required value={pass} onChange={(e) => setPass(e.target.value)} />
        {err && <div className="msg-err">{err}</div>}
        <button className="btn btn-blue" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p style={{ fontSize: 13.5, marginTop: 16, textAlign: 'center' }}>
        ¿No tenés cuenta? <Link href="/registro">Probá 3 días gratis</Link>
      </p>
      {!supabaseConfigurado && (
        <div className="msg-ok">Modo demo activo (sin base configurada): entrás directo, tus datos quedan en este navegador.</div>
      )}
    </div>
  );
}
