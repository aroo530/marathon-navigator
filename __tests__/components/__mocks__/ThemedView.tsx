import React from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & { lightColor?: string; darkColor?: string };
export function ThemedView({ children, lightColor: _l, darkColor: _d, ...rest }: Props) {
  return <View {...rest}>{children}</View>;
}
