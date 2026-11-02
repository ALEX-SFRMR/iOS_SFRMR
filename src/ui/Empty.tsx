import { View } from 'react-native';
import { space } from '@/theme/tokens';
import { Glass } from './Glass';
import { Text } from './Text';

/** Honest empty state: says what will appear here and how to get it. No fake numbers. */
export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Glass>
      <View style={{ gap: space.sm }}>
        <Text variant="headline">{title}</Text>
        <Text tone="dim">{body}</Text>
        {action ? <View style={{ marginTop: space.md }}>{action}</View> : null}
      </View>
    </Glass>
  );
}
