import { useState } from 'react'; import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'; import api, { errMsg } from '../api.js'; import { useApp } from '../context/AppContext.jsx';
const Shell = ({ title, children, foot }) => <div className="mx-auto max-w-sm"><h1 className="mb-6 text-3xl">{title}</h1><div className="card space-y-4">{children}</div><p className="mt-4 text-center text-sm text-stone-600">{foot}</p></div>;
const Field = ({ label, ...p }) => <label className="block"><span className="label">{label}</span><input className="input" required {...p} /></label>;
const useForm = (init) => { const [v, set] = useState(init); return [v, (k) => (e) => set({ ...v, [k]: e.target.value })]; };
const Err = ({ e }) => e ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{e}</p> : null;
export function Login() {
  const { session } = useApp(), nav = useNavigate(), loc = useLocation(), [f, on] = useForm({ email: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); try { const u = await session('/auth/login', f); nav(loc.state?.from || (u.role === 'admin' ? '/admin' : '/'), { replace: true }); } catch (x) { setErr(errMsg(x)); setBusy(false); } };
  return <Shell title="Welcome back" foot={<>New here? <Link className="text-accent" to="/register">Create an account</Link></>}><form onSubmit={go} className="space-y-4">
    <Err e={err} /><Field label="Email" type="email" autoComplete="email" value={f.email} onChange={on('email')} /><Field label="Password" type="password" autoComplete="current-password" value={f.password} onChange={on('password')} />
    <button className="btn btn-dark w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button><Link to="/forgot-password" className="block text-center text-sm text-stone-500">Forgot password?</Link></form></Shell>;
}
export function Register() {
  const { session } = useApp(), nav = useNavigate(), [f, on] = useForm({ name: '', email: '', password: '' }), [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); try { await session('/auth/register', f); nav('/'); } catch (x) { setErr(errMsg(x)); } };
  return <Shell title="Create account" foot={<>Have an account? <Link className="text-accent" to="/login">Log in</Link></>}><form onSubmit={go} className="space-y-4">
    <Err e={err} /><Field label="Name" value={f.name} onChange={on('name')} /><Field label="Email" type="email" value={f.email} onChange={on('email')} />
    <Field label="Password (8+ chars, letter & number)" type="password" minLength="8" value={f.password} onChange={on('password')} /><button className="btn btn-dark w-full">Sign up</button></form></Shell>;
}
export function Forgot() {
  const [sp] = useSearchParams(), token = sp.get('token'), [f, on] = useForm({ email: '', password: '' }), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); setErr('');
    try { const { data } = token ? await api.post('/auth/reset-password', { token, password: f.password }) : await api.post('/auth/forgot-password', { email: f.email });
      setMsg(data.message + (data.devResetToken ? ` (dev) Reset link: /forgot-password?token=${data.devResetToken}` : '')); } catch (x) { setErr(errMsg(x)); } };
  return <Shell title={token ? 'Set a new password' : 'Reset password'} foot={<Link className="text-accent" to="/login">Back to login</Link>}><form onSubmit={go} className="space-y-4">
    <Err e={err} />{msg && <p className="break-all rounded-lg bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
    {token ? <Field label="New password" type="password" minLength="8" value={f.password} onChange={on('password')} /> : <Field label="Email" type="email" value={f.email} onChange={on('email')} />}
    <button className="btn btn-dark w-full">{token ? 'Update password' : 'Send reset link'}</button></form></Shell>;
}
