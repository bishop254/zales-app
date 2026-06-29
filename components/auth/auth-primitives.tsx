import { MaterialIcons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/app/app-logo';
import { KeyboardResponsiveView } from '@/components/app/keyboard-responsive-view';
import { imagery, palette, radius, spacing, typography } from '@/constants/app-theme';

type AuthBackgroundProps = {
  children: ReactNode;
  contentStyle?: object;
  scroll?: boolean;
};

type AuthCardProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  styleVariant?: 'regular' | 'compact';
};

type AuthButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
};

type AuthTextFieldProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
  optionalLabel?: string;
  error?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  actionLabel?: string;
  onActionPress?: () => void;
  secureToggle?: boolean;
};

type AuthPressableFieldProps = {
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
  optionalLabel?: string;
  error?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  actionLabel?: string;
  onActionPress?: () => void;
  placeholder: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
};

type AuthSelectFieldProps = {
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  label: string;
  onSelect: (value: string) => void;
  options: { label: string; value: string }[];
  optionalLabel?: string;
  placeholder: string;
  value: string;
};

type AuthSearchSelectFieldProps = AuthSelectFieldProps & {
  searchPlaceholder?: string;
};

type ConsentRowProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

type SplitAuthLayoutProps = {
  children: ReactNode;
};

type OtpInputRowProps = {
  value: string[];
  onChangeDigit: (index: number, nextValue: string) => void;
};

export function AuthBackground({ children, contentStyle, scroll = true }: AuthBackgroundProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <ImageBackground source={{ uri: imagery.pipeline }} style={styles.absoluteFill} resizeMode="cover">
        <View style={styles.backgroundOverlay} />
      </ImageBackground>
      <KeyboardResponsiveView contentContainerStyle={[styles.backgroundContent, contentStyle]} scroll={scroll}>
        {children}
      </KeyboardResponsiveView>
    </SafeAreaView>
  );
}

export function SplitAuthLayout({ children }: SplitAuthLayoutProps) {
  return (
    <View style={styles.splitRoot}>
      <View style={styles.heroPanel}>
        <ImageBackground source={{ uri: imagery.pipeline }} style={styles.absoluteFill} resizeMode="cover">
          <View style={styles.heroImageDim} />
          <View style={styles.heroGradient} />
        </ImageBackground>
        <View style={styles.heroTop}>
          <AppLogo tint="light" />
          <Text style={styles.heroTitle}>Command your sales pipeline with precision.</Text>
          <Text style={styles.heroBody}>
            Join top-performing agents who rely on structured data and real-time insights to close deals faster.
          </Text>
        </View>
        <View style={styles.quoteCard}>
          <View style={styles.quoteAvatar}>
            <Image source={{ uri: imagery.testimonial }} style={styles.quoteAvatarImage} />
          </View>
          <View style={styles.quoteCopy}>
            <Text style={styles.quoteText}>&quot;The clearest view of my leads I&apos;ve ever had.&quot;</Text>
            <Text style={styles.quoteAttribution}>Michael R., Top Agent</Text>
          </View>
        </View>
      </View>
      <View style={styles.formPanel}>{children}</View>
    </View>
  );
}

export function AuthCard({
  children,
  contentContainerStyle,
  scrollable = false,
  styleVariant = 'regular',
}: AuthCardProps) {
  return (
    <View
      style={[
        styles.card,
        styleVariant === 'compact' ? styles.compactCard : null,
        scrollable ? styles.cardFrameScrollable : null,
        scrollable ? styles.cardScrollable : null,
      ]}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[
            styles.cardScrollContent,
            styleVariant === 'compact' ? styles.cardScrollContentCompact : styles.cardScrollContentRegular,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={contentContainerStyle}>{children}</View>
      )}
    </View>
  );
}

export function AuthHeader({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle: string;
  centered?: boolean;
}) {
  return (
    <View style={[styles.headerBlock, centered ? styles.headerCentered : null]}>
      <Text style={[styles.headerTitle, centered ? styles.textCenter : null]}>{title}</Text>
      <Text style={[styles.headerSubtitle, centered ? styles.textCenter : null]}>{subtitle}</Text>
    </View>
  );
}

export function AuthButton({
  disabled = false,
  loading = false,
  onPress,
  title,
  variant = 'primary',
}: AuthButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      style={[
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        disabled || loading ? styles.buttonDisabled : null,
      ]}
      onPress={onPress}>
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' ? palette.primary : palette.onPrimary} size="small" />
        ) : null}
        <Text style={[styles.buttonText, variant === 'secondary' ? styles.buttonTextSecondary : null]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

export function AuthTextField({
  actionLabel,
  containerStyle,
  error,
  icon,
  label,
  onActionPress,
  optionalLabel,
  secureTextEntry,
  secureToggle = false,
  ...props
}: AuthTextFieldProps) {
  const [visible, setVisible] = useState(false);
  const isSecure = secureTextEntry && !visible;

  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, error ? styles.fieldLabelError : null]}>{label}</Text>
        {optionalLabel ? <Text style={styles.optionalLabel}>{optionalLabel}</Text> : null}
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress}>
            <Text style={styles.fieldAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        {icon ? <MaterialIcons color={palette.outline} name={icon} size={20} /> : null}
        <TextInput
          placeholderTextColor={palette.outlineVariant}
          secureTextEntry={isSecure}
          style={styles.input}
          {...props}
        />
        {secureToggle ? (
          <Pressable hitSlop={8} onPress={() => setVisible((current) => !current)}>
            <MaterialIcons
              color={palette.onSurfaceVariant}
              name={visible ? 'visibility' : 'visibility-off'}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AuthPressableField({
  actionLabel,
  containerStyle,
  disabled = false,
  error,
  icon,
  label,
  onActionPress,
  onPress,
  optionalLabel,
  placeholder,
  value,
}: AuthPressableFieldProps) {
  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, error ? styles.fieldLabelError : null]}>{label}</Text>
        {optionalLabel ? <Text style={styles.optionalLabel}>{optionalLabel}</Text> : null}
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress}>
            <Text style={styles.fieldAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={[
          styles.inputShell,
          error ? styles.inputShellError : null,
          disabled ? styles.inputShellDisabled : null,
        ]}
        onPress={onPress}>
        {icon ? <MaterialIcons color={palette.outline} name={icon} size={20} /> : null}
        <Text numberOfLines={1} style={[styles.selectValue, !value ? styles.selectPlaceholder : null]}>
          {value || placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AuthSelectField({
  containerStyle,
  error,
  label,
  onSelect,
  options,
  optionalLabel,
  placeholder,
  value,
}: AuthSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, error ? styles.fieldLabelError : null]}>{label}</Text>
        {optionalLabel ? <Text style={styles.optionalLabel}>{optionalLabel}</Text> : null}
      </View>
      <Pressable
        style={[styles.inputShell, error ? styles.inputShellError : null]}
        onPress={() => setOpen((current) => !current)}>
        <Text
          numberOfLines={1}
          style={[styles.selectValue, !selectedLabel ? styles.selectPlaceholder : null]}>
          {selectedLabel ?? placeholder}
        </Text>
        <MaterialIcons
          color={palette.onSurfaceVariant}
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
        />
      </Pressable>
      {open ? (
        <View style={styles.optionsPanel}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={styles.optionRow}
              onPress={() => {
                onSelect(option.value);
                setOpen(false);
              }}>
              <Text style={[styles.optionText, option.value === value ? styles.optionTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AuthSearchSelectField({
  containerStyle,
  error,
  label,
  onSelect,
  options,
  optionalLabel,
  placeholder,
  searchPlaceholder = 'Search...',
  value,
}: AuthSearchSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, error ? styles.fieldLabelError : null]}>{label}</Text>
        {optionalLabel ? <Text style={styles.optionalLabel}>{optionalLabel}</Text> : null}
      </View>
      <Pressable
        style={[styles.inputShell, error ? styles.inputShellError : null]}
        onPress={() => setOpen((current) => !current)}>
        <Text
          numberOfLines={1}
          style={[styles.selectValue, !selectedLabel ? styles.selectPlaceholder : null]}>
          {selectedLabel ?? placeholder}
        </Text>
        <MaterialIcons
          color={palette.onSurfaceVariant}
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
        />
      </Pressable>
      {open ? (
        <View style={styles.optionsPanel}>
          <View style={styles.searchInputWrap}>
            <MaterialIcons color={palette.outline} name="search" size={18} />
            <TextInput
              placeholder={searchPlaceholder}
              placeholderTextColor={palette.outlineVariant}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.searchResultsScroll}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                    setQuery('');
                  }}>
                  <Text style={[styles.optionText, option.value === value ? styles.optionTextSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.noResultsText}>No matches found.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ConsentRow({ onValueChange, value }: ConsentRowProps) {
  return (
    <View style={styles.consentRow}>
      <Switch
        thumbColor={palette.onPrimary}
        trackColor={{ false: palette.outlineVariant, true: palette.primary }}
        value={value}
        onValueChange={onValueChange}
      />
      <Text style={styles.consentText}>
        I agree to the <Text style={styles.linkText}>Terms and Conditions</Text> and{' '}
        <Text style={styles.linkText}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

export function AuthBrandMark() {
  return (
    <View style={styles.brandMark}>
      <AppLogo tint="light" />
    </View>
  );
}

export function LoadingRail() {
  return (
    <View style={styles.loadingWrap}>
      <View style={styles.loadingTrack}>
        <View style={styles.loadingBar} />
      </View>
      <Text style={styles.loadingText}>Loading</Text>
    </View>
  );
}

export function OtpInputRow({ onChangeDigit, value }: OtpInputRowProps) {
  return (
    <View style={styles.otpRow}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          keyboardType="number-pad"
          maxLength={1}
          placeholder="·"
          placeholderTextColor={palette.onSurfaceVariant}
          style={styles.otpCell}
          textAlign="center"
          value={digit}
          onChangeText={(nextValue) => onChangeDigit(index, nextValue)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlayDark,
  },
  brandMark: {
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: palette.primary,
  },
  buttonSecondary: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.primary,
    borderWidth: 1,
  },
  buttonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  buttonTextSecondary: {
    color: palette.primary,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: palette.glass,
    borderColor: palette.surfaceContainerHighest,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: '100%',
    maxWidth: 480,
  },
  cardFrameScrollable: {
    padding: 0,
  },
  cardScrollable: {
    flexShrink: 1,
    maxHeight: '100%',
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  cardScrollContentCompact: {
    padding: spacing.xl,
  },
  cardScrollContentRegular: {
    padding: spacing.lg,
  },
  compactCard: {
    maxWidth: 440,
    padding: spacing.xl,
  },
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  consentText: {
    color: palette.onSurfaceVariant,
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  fieldAction: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '500',
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  fieldError: {
    color: palette.error,
    fontSize: typography.label,
    lineHeight: 16,
  },
  fieldLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  fieldLabelError: {
    color: palette.error,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  formPanel: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    padding: spacing.marginMobile,
  },
  headerBlock: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  headerCentered: {
    alignItems: 'center',
  },
  headerSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  headerTitle: {
    color: palette.onSurface,
    fontSize: typography.headline,
    fontWeight: '600',
  },
  heroBody: {
    color: palette.primaryFixed,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 320,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlayPrimarySoft,
    borderRadius: 0,
  },
  heroImageDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  heroPanel: {
    backgroundColor: palette.primary,
    justifyContent: 'space-between',
    flex: 5,
    minHeight: 380,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroTop: {
    gap: spacing.lg,
    zIndex: 1,
  },
  heroTitle: {
    color: palette.onPrimary,
    fontSize: typography.display,
    fontWeight: '700',
    lineHeight: 38,
    maxWidth: 340,
  },
  input: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
    minHeight: 48,
    paddingVertical: 0,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: palette.glassSoft,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputShellError: {
    borderColor: palette.error,
  },
  inputShellDisabled: {
    opacity: 0.7,
  },
  optionsPanel: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: {
    color: palette.onSurface,
    fontSize: typography.body,
  },
  optionTextSelected: {
    color: palette.primary,
    fontWeight: '700',
  },
  noResultsText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: palette.primary,
    fontWeight: '500',
  },
  loadingBar: {
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    height: '100%',
    width: '40%',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.labelCaps,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  loadingTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.pill,
    height: 3,
    overflow: 'hidden',
    width: 192,
  },
  loadingWrap: {
    alignItems: 'center',
    bottom: spacing.xl,
    gap: spacing.sm,
    position: 'absolute',
    width: '100%',
  },
  optionalLabel: {
    color: palette.onSurfaceVariant,
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  otpCell: {
    backgroundColor: palette.glassSoft,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.onSurface,
    fontSize: typography.headline,
    fontWeight: '600',
    height: 60,
    width: 46,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  quoteAttribution: {
    color: palette.primaryFixed,
    fontSize: 12,
  },
  quoteAvatar: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: radius.pill,
    height: 40,
    overflow: 'hidden',
    width: 40,
  },
  quoteAvatarImage: {
    height: '100%',
    width: '100%',
  },
  quoteCard: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 227, 255, 0.2)',
    borderColor: palette.lineDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    zIndex: 1,
  },
  quoteCopy: {
    gap: spacing.xs,
  },
  quoteText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
    maxWidth: 250,
  },
  selectPlaceholder: {
    color: palette.outlineVariant,
  },
  selectValue: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
    flexShrink: 1,
  },
  screen: {
    backgroundColor: palette.deepNavy,
    flex: 1,
  },
  searchInput: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.bodySmall,
    minHeight: 40,
    paddingVertical: 0,
  },
  searchInputWrap: {
    alignItems: 'center',
    borderBottomColor: palette.outlineVariant,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchResultsScroll: {
    maxHeight: 220,
  },
  splitRoot: {
    alignSelf: 'center',
    backgroundColor: palette.deepNavy,
    borderColor: palette.surfaceContainerHighest,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 1180,
    overflow: 'hidden',
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
  },
});
