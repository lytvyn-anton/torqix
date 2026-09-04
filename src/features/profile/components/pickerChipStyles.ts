import { StyleSheet } from 'react-native';

export const pickerChipStyles = StyleSheet.create({
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
