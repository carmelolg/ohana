import { Check } from 'lucide-react';
import type { ShoppingItem } from '../../lib/types';

/** Voce della lista: casella, testo e quantità. */
export function ShoppingItemRow({
  item,
  onToggle,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
}) {
  return (
    <div className={'item' + (item.checked ? ' checked' : '')}>
      <button
        className="check"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.text}
        onClick={() => onToggle(item)}
      >
        <span className="box">{item.checked && <Check size={16} strokeWidth={3} />}</span>
      </button>
      <span className="txt">{item.text}</span>
      {item.qty && <span className="qty">{item.qty}</span>}
    </div>
  );
}
