import { useId, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { passwordStrength, STRENGTH_LABEL } from '../../lib/accountConfig';

/* ============================================================================
 * Password field.
 *
 * The old form had no visibility toggle at all. On a phone — where 85% of this
 * store's customers are — typing a password blind into a 4mm-wide keyboard is
 * one of the top causes of failed sign-ins. The toggle is a real button with a
 * 44px hit area and an aria-label that says which state it will switch TO.
 *
 * The strength meter is decoration only: it never blocks submission. The
 * merchant's policy (passwordError) decides what is acceptable, and the server
 * enforces the same rule again.
 * ========================================================================== */
export default function PasswordField({
  label = 'Password', value, onChange, error, hint,
  autoComplete = 'current-password', showMeter = false, required,
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const msgId = `${id}-msg`;
  const meterId = `${id}-meter`;
  const score = showMeter ? passwordStrength(value) : 0;

  const describedBy = [error || hint ? msgId : null, showMeter && value ? meterId : null]
    .filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`peer h-14 w-full rounded-control border bg-white pl-3.5 pr-14 pt-5 text-body text-ink
            transition-colors duration-fast placeholder-shown:text-transparent focus:outline-none
            ${error ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-obsidian'}`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3.5 top-1.5 origin-left text-caption
            transition-all duration-fast motion-reduce:transition-none
            peer-placeholder-shown:top-4 peer-placeholder-shown:text-body
            peer-focus:top-1.5 peer-focus:text-caption
            ${error ? 'text-red-600' : 'text-ash peer-focus:text-graphite'}`}
        >
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>

        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
        >
          {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>

      {showMeter && value && (
        <div className="mt-2">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-base motion-reduce:transition-none ${
                  i <= score
                    ? (score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-sagedeep')
                    : 'bg-satin'
                }`}
              />
            ))}
          </div>
          <p id={meterId} className="mt-1 text-caption text-ash">
            Password strength: {STRENGTH_LABEL[score] || 'Weak'}
          </p>
        </div>
      )}

      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 flex items-start gap-1.5 text-caption text-ash">
          {value && !error && <Check size={12} className="mt-0.5 shrink-0 text-sagedark" aria-hidden="true" />}
          {hint}
        </p>
      ) : null}
    </div>
  );
}
