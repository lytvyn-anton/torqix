import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { usePickerChipStyles } from './pickerChipStyles';

type Props<T extends string> = {
  options: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
  labelKey: (option: T) => string;
  testIDPrefix: string;
};

export function MultiOptionPicker<T extends string>({
  options,
  value,
  onChange,
  labelKey,
  testIDPrefix,
}: Props<T>) {
  const { t } = useTranslation();
  const styles = usePickerChipStyles();

  const toggle = (option: T) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <TouchableOpacity
            key={option}
            onPress={() => toggle(option)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`option-${testIDPrefix}-${option}`}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {t(labelKey(option))}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
