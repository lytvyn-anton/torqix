import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props<T extends string> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  labelKey: (option: T) => string;
};

export function OptionPicker<T extends string>({ options, value, onChange, labelKey }: Props<T>) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`option-${option}`}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipText: {
    color: '#111',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
