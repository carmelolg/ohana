import { AlertCircle } from 'lucide-react';

/** Avviso d'errore di un modulo, ben visibile in cima: `showFormError` lo porta in vista quando compare. */
export function FormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }
  return (
    <div className="form-error" role="alert" data-form-error>
      <AlertCircle size={20} strokeWidth={1.75} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
