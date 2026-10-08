import type { CSSProperties, ReactNode } from 'react';
import { useSoundContext } from '../hooks/useSound';

export interface ChoiceOption<T> {
  value: T;
  title: ReactNode;
  description?: string;
}

interface ChoiceGroupProps<T extends string | number> {
  legend: string;
  name: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
}

/** Accessible radio group rendered as selectable cards. Selection is shown by a check mark, not only by colour. */
export function ChoiceGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  columns = 2,
}: ChoiceGroupProps<T>) {
  const { play } = useSoundContext();
  return (
    <fieldset className="field">
      <legend className="field__legend">{legend}</legend>
      <div className="choices" style={{ '--cols': columns } as CSSProperties}>
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                play('click');
                onChange(option.value);
              }}
            />
            <span className="choice__title">
              {option.title}
              <span className="choice__check" aria-hidden="true">✓</span>
            </span>
            {option.description && <span className="choice__desc">{option.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
