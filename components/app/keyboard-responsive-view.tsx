import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type KeyboardResponsiveViewProps = {
  children?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraKeyboardSpace?: number;
  keyboardVerticalOffset?: number;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardResponsiveView({
  children,
  contentContainerStyle,
  extraKeyboardSpace = 32,
  keyboardVerticalOffset = 0,
  scroll = true,
  style,
}: KeyboardResponsiveViewProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollFocusedInputIntoView = useCallback(
    (target?: number | null) => {
      if (!scroll || Platform.OS === 'web' || !target) {
        return;
      }

      requestAnimationFrame(() => {
        const responder = scrollRef.current as
          | (ScrollView & {
              scrollResponderScrollNativeHandleToKeyboard?: (
                nodeHandle: number,
                additionalOffset?: number,
                preventNegativeScrollOffset?: boolean
              ) => void;
            })
          | null;

        responder?.scrollResponderScrollNativeHandleToKeyboard?.(
          target,
          extraKeyboardSpace,
          true
        );
      });
    },
    [extraKeyboardSpace, scroll]
  );

  const bottomInset = extraKeyboardSpace;
  const keyboardOpenLayout = keyboardHeight > 0 ? styles.keyboardOpenContent : null;

  const sharedProps = {
    onFocusCapture: (event: { nativeEvent?: { target?: number }; target?: number }) => {
      scrollFocusedInputIntoView(event.target ?? event.nativeEvent?.target);
    },
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.flex, style]}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            { paddingBottom: bottomInset },
            keyboardOpenLayout,
          ]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...sharedProps}>
          {children}
        </ScrollView>
      ) : (
        <View
          style={[styles.flex, contentContainerStyle, { paddingBottom: bottomInset }, keyboardOpenLayout]}
          {...sharedProps}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardOpenContent: {
    justifyContent: 'flex-start',
  },
});
