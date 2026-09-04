import type { PropsWithChildren } from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

import { authFormStyles as styles } from '../authFormStyles';

export function AuthScreenContainer({ children }: PropsWithChildren) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
