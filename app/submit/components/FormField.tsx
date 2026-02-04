'use client';

import CharacterCounter from './CharacterCounter';

interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Field name for form handling */
  name: string;
  /** Input type: text, email, or textarea */
  type?: 'text' | 'email' | 'textarea';
  /** Whether the field is required */
  required?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Minimum character length */
  minLength?: number;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Error message to display */
  error?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text displayed below the field */
  helpText?: string;
  /** Number of rows for textarea */
  rows?: number;
  /** Whether to auto-focus this field */
  autoFocus?: boolean;
}

/**
 * Reusable form field component with label, validation, and character counter
 *
 * Features:
 * - Renders input or textarea based on type
 * - Displays required indicator (*) when required
 * - Shows character counter when maxLength is provided
 * - Displays error messages with proper ARIA attributes
 * - Help text for guidance
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Idea Title"
 *   name="title"
 *   required
 *   maxLength={100}
 *   value={title}
 *   onChange={setTitle}
 *   error={errors.title}
 *   placeholder="e.g., Recipe sharing app"
 * />
 * ```
 */
export default function FormField({
  label,
  name,
  type = 'text',
  required = false,
  maxLength,
  minLength,
  value,
  onChange,
  error,
  placeholder,
  helpText,
  rows = 3,
  autoFocus = false,
}: FormFieldProps) {
  const inputClassName = `
    w-full px-4 py-3 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-peritus-blue
    transition-colors duration-200
    ${error ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}
  `;

  const commonProps = {
    id: name,
    name,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    placeholder,
    maxLength,
    minLength,
    required,
    autoFocus,
    className: inputClassName,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${name}-error` : helpText ? `${name}-help` : undefined,
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {type === 'textarea' ? (
        <textarea {...commonProps} rows={rows} />
      ) : (
        <input type={type} {...commonProps} />
      )}

      {/* Character Counter */}
      {maxLength && <CharacterCounter current={value.length} max={maxLength} />}

      {/* Help Text */}
      {helpText && !error && (
        <p id={`${name}-help`} className="text-sm text-slate-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
