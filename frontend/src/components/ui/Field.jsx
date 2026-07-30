import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Labelled form control with the accessibility wiring done once.
 *
 * Ties the label to the input, points aria-describedby at the hint, sets
 * aria-invalid and announces the error politely. Every checkout and account
 * field previously repeated this by hand — and mostly skipped the aria parts.
 */
export default function Field({
  label,
  hint,
  error,
  required,
  children,        // render-prop: (props) => <input {...props} />
  className = '',
  id: idProp,
}) {
  const auto = useId();
  const id = idProp || auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  const control = children({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    className: `input ${error ? 'input-error' : ''}`,
  });

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span aria-hidden="true" className="ml-0.5 text-clay">*</span>}
        </label>
      )}
      {control}
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && (
        <p id={errId} className="field-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
