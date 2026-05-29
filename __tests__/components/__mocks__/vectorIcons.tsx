import React from 'react';
import { Text } from 'react-native';

type IconProps = { name?: string; size?: number; color?: string; [key: string]: any };
const MockIcon = ({ name, ...rest }: IconProps) => <Text {...rest}>{name}</Text>;

export const Ionicons = MockIcon;
export const MaterialIcons = MockIcon;
export const FontAwesome = MockIcon;
export const Feather = MockIcon;
export default { Ionicons: MockIcon, MaterialIcons: MockIcon, FontAwesome: MockIcon, Feather: MockIcon };
