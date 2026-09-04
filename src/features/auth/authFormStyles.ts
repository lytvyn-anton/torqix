import { StyleSheet } from 'react-native';

export const authFormStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  error: {
    color: '#c00',
  },
  submitButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchAction: {
    fontWeight: '600',
  },
});
