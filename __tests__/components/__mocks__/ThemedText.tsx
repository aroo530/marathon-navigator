import React from 'react';
import { Text, TextProps } from 'react-native';

type Props = TextProps & { type?: string; lightColor?: string; darkColor?: string };
export function ThemedText({ children, type: _type, lightColor: _l, darkColor: _d, ...rest }: Props) {
  return <Text {...rest}>{children}</Text>;
}
