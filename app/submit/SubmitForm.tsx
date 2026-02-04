'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitIdeaRequestSchema } from '@utmessa/shared';
import type { SubmitIdeaResponse } from '@utmessa/shared';
import FormField from './components/FormField';
import MustHavesList from './components/MustHavesList';
import SubmitButton from './components/SubmitButton';
import SuccessMessage from './components/SuccessMessage';

/**
 * Form data structure
 */
interface FormData {
  title: string;
  problem: string;
  mustHaves: string[];
  email: string;
}

/**
 * Main submission form component
 *
 * Features:
 * - Manages form state (title, problem, mustHaves, email)
 * - Client-side validation with Zod schemas from @utmessa/shared
 * - Submits to POST /api/ideas
 * - Handles loading states and errors
 * - Displays success message and redirects to receipt page
 *
 * @example
 * ```tsx
 * <SubmitForm />
 * ```
 */
export default function SubmitForm() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    problem: '',
    mustHaves: [''],
    email: '',
  });

  // Validation errors (keyed by field path)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [receiptToken, setReceiptToken] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Auto-redirect after successful submission
  useEffect(() => {
    if (submitSuccess && receiptToken) {
      const timer = setTimeout(() => {
        router.push(`/i/${receiptToken}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess, receiptToken, router]);

  /**
   * Validate the entire form and return whether it's valid
   */
  const validateForm = (): boolean => {
    // Prepare data for validation (trim strings, filter empty mustHaves)
    const dataToValidate = {
      title: formData.title.trim(),
      problem: formData.problem.trim(),
      mustHaves: formData.mustHaves
        .map((h) => h.trim())
        .filter((h) => h.length > 0),
      email: formData.email.trim() || undefined,
    };

    // Validate with Zod schema
    const result = SubmitIdeaRequestSchema.safeParse(dataToValidate);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Prepare request data
      const requestData = {
        title: formData.title.trim(),
        problem: formData.problem.trim(),
        mustHaves: formData.mustHaves
          .map((h) => h.trim())
          .filter((h) => h.length > 0),
        email: formData.email.trim() || undefined,
      };

      // Submit to API
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // Handle response
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          setApiError(errorData.error || 'Validation failed. Please check your input.');
        } else if (response.status >= 500) {
          setApiError('Server error. Please try again later.');
        } else {
          setApiError('An unexpected error occurred. Please try again.');
        }
        return;
      }

      // Success
      const data: SubmitIdeaResponse = await response.json();
      setReceiptToken(data.token);
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Submission error:', error);
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after submission
  if (submitSuccess && receiptToken) {
    return <SuccessMessage token={receiptToken} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 border border-slate-200"
      noValidate
    >
      {/* Privacy Notice */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
        <p className="text-sm text-amber-800">
          <strong>Persónuvernd:</strong> Ekki setja inn viðkvæmar, trúnaðar eða
          persónugreinanlegar upplýsingar. Þetta er opinbert kynningarkerfi.
        </p>
      </div>

      {/* Title Field */}
      <FormField
        label="Heiti hugmyndar"
        name="title"
        required
        maxLength={100}
        value={formData.title}
        onChange={(value) => setFormData({ ...formData, title: value })}
        error={errors.title}
        placeholder="t.d. Uppskriftaforrit fyrir fjölskyldur"
        autoFocus
      />

      {/* Problem Field */}
      <FormField
        label="Lýsing á vandamálinu"
        name="problem"
        type="textarea"
        required
        maxLength={500}
        minLength={10}
        value={formData.problem}
        onChange={(value) => setFormData({ ...formData, problem: value })}
        error={errors.problem}
        placeholder="Lýstu vandamálinu sem þú vilt leysa..."
        rows={4}
      />

      {/* Must-Haves List */}
      <MustHavesList
        items={formData.mustHaves}
        onChange={(items) => setFormData({ ...formData, mustHaves: items })}
        errors={errors}
      />

      {/* Email Field */}
      <FormField
        label="Netfang (valfrjálst)"
        name="email"
        type="email"
        value={formData.email}
        onChange={(value) => setFormData({ ...formData, email: value })}
        error={errors.email}
        placeholder="netfang@daemi.is"
        helpText="Fáðu tilkynningu þegar prufuútgáfan er tilbúin"
      />

      {/* API Error */}
      {apiError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r" role="alert">
          <p className="text-sm text-red-800">{apiError}</p>
        </div>
      )}

      {/* Submit Button */}
      <SubmitButton isSubmitting={isSubmitting} />
    </form>
  );
}
