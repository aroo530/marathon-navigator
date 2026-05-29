import React from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & { colors?: string[]; start?: object; end?: object };
export function LinearGradient({ children, colors: _c, start: _s, end: _e, ...rest }: Props) {
  return <View {...rest}>{children}</View>;
}
