import { DIFFICULTIES, type Difficulty } from '../game/types';
import { DIFFICULTY_DESCRIPTION, DIFFICULTY_LABEL } from '../utils/labels';
import { ChoiceGroup } from './ChoiceGroup';

export function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <ChoiceGroup<Difficulty>
      legend="Difficulty"
      name="setup-difficulty"
      value={value}
      onChange={onChange}
      options={DIFFICULTIES.map((d) => ({
        value: d,
        title: DIFFICULTY_LABEL[d],
        description: DIFFICULTY_DESCRIPTION[d],
      }))}
    />
  );
}
