import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    navigate('/forgot-password');
    return null;
  }

  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordRepeat) {
      setError('Passwords do not match');
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (token.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      // First verify the OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      // Then update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      navigate('/login', {
        replace: true,
        state: { message: 'Password updated successfully. Please log in with your new password.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the verification code sent to {email} and your new password
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter 6-digit code"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label htmlFor="password-repeat" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              id="password-repeat"
              name="password-repeat"
              type="password"
              required
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                password !== passwordRepeat && passwordRepeat
                  ? 'border-red-300'
                  : 'border-gray-300'
              }`}
              placeholder="Confirm new password"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p>Password must:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Be at least 8 characters long</li>
              <li>Contain at least one uppercase letter</li>
              <li>Contain at least one lowercase letter</li>
              <li>Contain at least one number</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Reset Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}