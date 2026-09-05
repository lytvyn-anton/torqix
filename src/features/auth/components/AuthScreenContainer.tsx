import type { PropsWithChildren } from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

import { useAuthFormStyles } from '../authFormStyles';

export function AuthScreenContainer({ children }: PropsWithChildren) {
  const styles = useAuthFormStyles();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
