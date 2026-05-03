# Auth Form Keyboard Layout Fix

## Summary

This note captures the changes made to the React Native auth screens so the forms behave correctly before and after the keyboard opens.

The work focused on the splash-to-auth flow screens, especially:

- `login`
- `register`
- `verify`

The main shared logic lives in:

- `components/app/keyboard-responsive-view.tsx`
- `components/auth/auth-primitives.tsx`

## Problem We Had

The auth pages had several layout issues after the new reusable form and keyboard behavior was introduced:

1. After the splash screen, the auth pages could fail to appear because the inner form card was using a full keyboard wrapper in a place where a simple internal scroll container was needed.
2. When inputs were focused, the form could feel like it was floating too high, with the upper part visually cut off.
3. There was too much empty space between the bottom of the form and the keyboard.
4. The whole page behavior and the form-card behavior were competing with each other, which made the layout unstable.

In short, the page-level keyboard handling and the card-level scrolling responsibilities were mixed together.

## Logic Behind the Fix

The fix was based on separating responsibilities clearly:

### 1. Let the page handle keyboard avoidance

`AuthBackground` continues to use the shared `KeyboardResponsiveView` so the screen can react when the keyboard opens.

This is the correct place for:

- keyboard avoidance
- focused-input visibility
- overall page shifting

### 2. Let the card handle only its own scrolling

`AuthCard` was updated so that when it is marked as `scrollable`, it uses an internal `ScrollView`.

This means:

- the page no longer scrolls unnecessarily
- the form scrolls inside its own visible card area
- the card remains stable on screen

This resolved the case where the page could collapse or render incorrectly after splash.

### 3. Remove exaggerated bottom spacing when the keyboard opens

The original keyboard wrapper added bottom padding using:

- keyboard height
- extra keyboard space

That created a large artificial gap above the keyboard.

The logic was adjusted so the wrapper keeps only a small fixed bottom inset rather than adding the entire keyboard height again.

### 4. Stop vertically centering content while the keyboard is open

When the keyboard opens, vertically centered content tends to shift upward too aggressively and gets clipped at the top.

The shared keyboard wrapper now changes layout behavior while the keyboard is open so content aligns from the top instead of staying centered.

This gives the form a more natural mobile feel and keeps more of it visible.

### 5. Trim page padding to recover usable height

The auth background vertical padding was reduced slightly so the form has more available room even before the keyboard opens.

## Before And After Code Samples

### Example 1: Card-level keyboard wrapper before

Before, the auth card used the shared keyboard wrapper inside the card itself:

```tsx
export function AuthCard({
  children,
  contentContainerStyle,
  scrollable = false,
  styleVariant = 'regular',
}: AuthCardProps) {
  return (
    <View style={[styles.card, scrollable ? styles.cardScrollable : null]}>
      {scrollable ? (
        <KeyboardResponsiveView
          contentContainerStyle={[
            styles.cardScrollContent,
            styleVariant === 'compact'
              ? styles.cardScrollContentCompact
              : styles.cardScrollContentRegular,
            contentContainerStyle,
          ]}
          extraKeyboardSpace={20}
          scroll>
          {children}
        </KeyboardResponsiveView>
      ) : (
        <View style={contentContainerStyle}>{children}</View>
      )}
    </View>
  );
}
```

This made the card behave like a full page instead of a contained form area.

### Example 1: Card-level scroll after

After, the page keeps keyboard responsibility and the card only scrolls its own content:

```tsx
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
            styleVariant === 'compact'
              ? styles.cardScrollContentCompact
              : styles.cardScrollContentRegular,
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
```

### Example 2: Bottom spacing before

Before, the keyboard wrapper added keyboard height into bottom padding:

```tsx
const bottomInset =
  keyboardHeight > 0 ? keyboardHeight + extraKeyboardSpace : extraKeyboardSpace;
```

That created too much space between the form and the keyboard.

### Example 2: Bottom spacing after

After, the wrapper keeps a small fixed inset instead:

```tsx
const bottomInset = extraKeyboardSpace;
const keyboardOpenLayout = keyboardHeight > 0 ? styles.keyboardOpenContent : null;
```

### Example 3: Centered layout before

Before, the page content remained centered even while the keyboard was open:

```tsx
<View style={[styles.flex, contentContainerStyle, { paddingBottom: bottomInset }]}>
  {children}
</View>
```

That contributed to the form looking cut off on the upper side.

### Example 3: Top-aligned layout after

After, the layout switches away from centering when the keyboard is open:

```tsx
<View
  style={[
    styles.flex,
    contentContainerStyle,
    { paddingBottom: bottomInset },
    keyboardOpenLayout,
  ]}>
  {children}
</View>
```

With:

```tsx
keyboardOpenContent: {
  justifyContent: 'flex-start',
},
```

### Example 4: Auth page padding before and after

Before:

```tsx
backgroundContent: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: spacing.marginMobile,
  paddingVertical: spacing.xl,
},
```

After:

```tsx
backgroundContent: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: spacing.marginMobile,
  paddingVertical: spacing.lg,
},
```

This gave the form more usable height on smaller screens.

## Outcome

After the fix:

1. The pages render correctly after the splash screen.
2. The auth forms remain visible and usable with or without the keyboard.
3. The form scrolls inside its own card instead of making the entire page feel unstable.
4. The focused input stays in view more naturally.
5. The large gap between the keyboard and the form has been reduced.
6. The shared behavior is reusable for future form screens because it now lives in the common layout primitives instead of in one-off screen logic.

## Files Involved

- `components/app/keyboard-responsive-view.tsx`
- `components/auth/auth-primitives.tsx`
- `app/login.tsx`
- `app/register.tsx`
- `app/verify.tsx`

## Why This Structure Is Better

This structure is more maintainable because:

- keyboard logic is centralized
- form-card scrolling is predictable
- screen files stay simpler
- future auth or profile forms can reuse the same behavior

The final design goal was not just to patch one screen, but to create a consistent and reusable pattern for all form-based pages going forward.
