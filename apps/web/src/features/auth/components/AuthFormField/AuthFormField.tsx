import type { ComponentProps } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import styles from './AuthFormField.module.css';

type AuthFormFieldProps = ComponentProps<'input'> & {
  error?: string;
  invalid?: boolean;
  label: string;
  message?: string;
};

export function AuthFormField({ error, id, invalid = false, label, message, ...inputProps }: AuthFormFieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const displayedMessage = error ?? message;
  const isInvalid = Boolean(error) || invalid;

  return (
    <div className={styles.formField}>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        aria-describedby={displayedMessage ? errorId : undefined}
        aria-invalid={isInvalid}
        className={`${styles.input} ${isInvalid ? styles.inputInvalid : ''}`}
        id={id}
      />
      <div className={styles.errorArea} id={errorId}>
        {displayedMessage && (
          <span className={styles.error} role='alert'>
            <FiAlertCircle aria-hidden='true' />
            {displayedMessage}
          </span>
        )}
      </div>
    </div>
  );
}
