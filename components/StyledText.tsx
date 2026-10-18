import { Text, type TextThemedProps } from './Themed';

export function MonoText(props: TextThemedProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
