'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

interface EmailAuthFormProps {
  mode: 'signin' | 'signup';
  onSuccess: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  displayName: string;
}

export function EmailAuthForm({ mode, onSuccess }: EmailAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const { signIn } = useAuth();
  const { error: showError, success } = useToast();

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Sign up specific validations
    if (mode === 'signup') {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        // Sign in with email/password
        const result = await signIn('email', {
          email: formData.email,
          password: formData.password,
        });

        if (result.error) {
          throw result.error;
        }
      } else {
        // Sign up with email/password
        const response = await fetch('/api/auth/email/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            username: formData.username,
            display_name: formData.displayName || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Sign up failed');
        }

        success('Account created! Please check your email to verify your account.');

        // Auto sign in after successful signup
        const signInResult = await signIn('email', {
          email: formData.email,
          password: formData.password,
        });

        if (signInResult.error) {
          // Don't throw error here, user can manually sign in
          console.warn('Auto sign-in failed:', signInResult.error);
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Email auth error:', err);
      showError(
        err instanceof Error
          ? err.message
          : `${mode === 'signin' ? 'Sign in' : 'Sign up'} failed`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Field */}
      <div className="form-group">
        <label className="form-label">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`input pl-10 ${errors.email ? 'border-red-500' : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>
        {errors.email && <div className="form-error">{errors.email}</div>}
      </div>

      {/* Username Field (Sign Up Only) */}
      {mode === 'signup' && (
        <div className="form-group">
          <label className="form-label">Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`input pl-10 ${errors.username ? 'border-red-500' : ''}`}
              placeholder="Choose a username"
              disabled={isLoading}
            />
          </div>
          {errors.username && <div className="form-error">{errors.username}</div>}
          <div className="form-description">
            This will be your unique identifier on Stumble Higher
          </div>
        </div>
      )}

      {/* Display Name Field (Sign Up Only) */}
      {mode === 'signup' && (
        <div className="form-group">
          <label className="form-label">Display Name (Optional)</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className="input"
            placeholder="Your display name"
            disabled={isLoading}
          />
          <div className="form-description">
            This is how others will see your name
          </div>
        </div>
      )}

      {/* Password Field */}
      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`input pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <div className="form-error">{errors.password}</div>}
        {mode === 'signup' && (
          <div className="form-description">
            Must be at least 8 characters long
          </div>
        )}
      </div>

      {/* Confirm Password Field (Sign Up Only) */}
      {mode === 'signup' && (
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`input pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>
          {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn btn-default py-3 flex items-center justify-center gap-2"
      >
        {isLoading && <LoadingSpinner size="sm" color="white" />}
        <span>
          {isLoading
            ? `${mode === 'signin' ? 'Signing in' : 'Creating account'}...`
            : mode === 'signin' ? 'Sign In' : 'Create Account'
          }
        </span>
      </button>

      {/* Forgot Password Link (Sign In Only) */}
      {mode === 'signin' && (
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-brand hover:underline"
            onClick={() => {
              // TODO: Implement forgot password
              showError('Password reset is not yet implemented');
            }}
          >
            Forgot your password?
          </button>
        </div>
      )}
    </form>
  );
}
