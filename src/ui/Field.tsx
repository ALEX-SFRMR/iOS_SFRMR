import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius, space } from '@/theme/tokens';
import { Text } from './Text';

export type FieldRef = ComponentRef<typeof TextInput>;

// React 19: ref is a plain prop.
export function Field({ label, style, ref, ...rest }: Omit<TextInputProps, 'ref'> & { label?: string; ref?: Ref<FieldRef> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label" tone="dim">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={color.textFaint}
        selectionColor={color.red}
        keyboardAppearance="dark"
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[styles.input, focused && styles.focused, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    color: color.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
  focused: { borderColor: color.hairlineStrong, backgroundColor: 'rgba(255,255,255,0.09)' },
});
