import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (mode === 'register' && password.length < 12) {
      setFieldErrors({ password: ['must be at least 12 characters'] });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (f: string) =>
    fieldErrors[f] ? <span className="field-error" id={`${f}-error`}>{fieldErrors[f]?.join(', ')}</span> : null;

  return (
    <form className="card auth" onSubmit={submit} noValidate aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      {error && <p role="alert" className="error">{error}</p>}
      {mode === 'register' && (
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          {fieldError('name')}
        </label>
      )}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-describedby="email-error" />
        {fieldError('email')}
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby="password-error" />
        {fieldError('password')}
      </label>
      <button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
      </button>
    </form>
  );
}
