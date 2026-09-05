import { render, type RenderResult } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../theme/ThemeProvider';

// Every screen/component now reads colors via useTheme(), so tests need a ThemeProvider
// ancestor even when the test itself doesn't care about theming. Centralized here so each
// test file doesn't repeat the wrapper.
export function renderWithProviders(ui: ReactElement): Promise<RenderResult> {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
