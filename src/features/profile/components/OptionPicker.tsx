import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { usePickerChipStyles } from './pickerChipStyles';

type Props<T extends string> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  labelKey: (option: T) => string;
  testIDPrefix: string;
};

export function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  labelKey,
  testIDPrefix,
}: Props<T>) {
  const { t } = useTranslation();
  const styles = usePickerChipStyles();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(option)}
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
