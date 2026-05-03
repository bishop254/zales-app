# Billing Page Visibility Reset

## The Short Version

This note captures a deceptively simple bug:

The `Billing` page loaded its header.
It loaded its bottom nav.
It loaded the background.

And then it showed... nothing.

That made it feel like a styling issue at first, but it turned out to be more of a rendering-path problem. The shell was alive, the route was alive, but the body content kept disappearing as we layered billing-specific logic back in.

The fix was not a single line. It was a reset in thinking:

- prove the shell works
- prove static body content works
- separate layout from data
- only reintroduce logic after the body is visibly stable

That gave us a billing page we could trust again.

## What We Saw

The symptoms were consistent:

1. The floating header rendered.
2. The bottom nav rendered.
3. The patterned page background rendered.
4. The billing content area looked blank.

This was especially confusing because other pages using the same reusable shell, like `Covers`, rendered correctly.

That told us something important:

The reusable page shell was probably not the problem.

## The Real Problem

The issue was not "billing is broken everywhere."
It was more specific:

`Billing` had become too heavy, too fast.

The screen body was trying to mix:

- async overview loading
- refresh behavior
- conditional subscription branches
- pending-payment logic
- plan-selection logic
- checkout modal logic
- status rendering

All inside one route that we were also actively reshaping.

So the page did not fail at the shell level. It failed at the content-composition level.

## The Debugging Logic

Instead of guessing, we used elimination:

### Step 1. Prove the shell is healthy

We compared `Billing` with `Covers`.

`Covers` uses the same `FloatingPageShell` pattern and rendered fine, so the shell, safe area, header, and bottom nav structure were not the root issue.

### Step 2. Replace the body with something dumb and obvious

We temporarily removed the dynamic billing content and rendered dashboard-style cards.

Those cards appeared.

That was the turning point.

It proved:

- the route mounts
- the body can render
- the page shell accepts children correctly

Which meant the disappearing content was caused by the billing body logic, not by the route container.

### Step 3. Reduce the billing page to a static status row

After proving the shell worked, we removed the temporary cards and replaced the page body with one compact, static subscription-status row.

That gave us a reliable baseline:

- visually obvious
- easy to debug
- no hidden branching
- no dependency on async timing

## Before And After Code Samples

### Example 1: Logic-heavy billing body before

Before, the page body mixed loading, multiple branches, and dynamic billing rendering:

```tsx
{loading ? (
  <View style={styles.loadingCard}>
    <ActivityIndicator color={palette.primary} />
    <Text style={styles.loadingText}>Loading billing details...</Text>
  </View>
) : !hasActiveSubscription ? (
  <View style={styles.statusCard}>
    <Text style={styles.statusTitle}>Subscription Required</Text>
    <Text style={styles.statusBody}>
      Activate a plan to continue using your workspace modules.
    </Text>
  </View>
) : (
  <>
    <BillsSection bills={bills.active} emptyText="No active bills." title="Active Bills" tone="active" />
    <BillsSection bills={bills.past} emptyText="No past bills." title="Past Bills" tone="inactive" />
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Subscription History</Text>
      {subscriptionHistory.map((subscription) => (
        <View key={subscription.id} style={styles.historyCard}>
          <Text>{subscription.plan?.name}</Text>
        </View>
      ))}
    </View>
  </>
)}
```

This was valid code, but during active refactors it made the body much harder to reason about.

### Example 1: Static visual proof after

We temporarily replaced the billing body with a simple, guaranteed visible structure:

```tsx
<View style={styles.heroSection}>
  <Text style={styles.heroTitle}>Subscription Status</Text>
  <Text style={styles.heroBody}>Static test content for the billing page body.</Text>
</View>

<View style={styles.contentWrap}>
  <View style={styles.statusRow}>
    <View style={[styles.statusIconWrap, styles.statusIconWrapActive]}>
      <MaterialIcons color="#15803D" name="verified-user" size={20} />
    </View>
    <View style={styles.statusCopy}>
      <Text style={styles.statusTitle}>Pro Plan</Text>
      <Text style={styles.statusMeta}>This row should always be visible.</Text>
    </View>
    <View style={[styles.statusPill, styles.statusPillActive]}>
      <Text style={styles.statusPillText}>ACTIVE</Text>
    </View>
  </View>
</View>
```

This was not the final product.
It was a diagnostic checkpoint.

And that checkpoint mattered, because it separated layout truth from data uncertainty.

### Example 2: Content spread across multiple responsibilities before

Before, `Billing` was responsible for both "what should appear" and "when/why the billing engine should run":

```tsx
const nextOverview = await getBillingOverview(session.accessToken);
const nextBills = await getBillingBills(session.accessToken);
const nextPlans =
  nextOverview.availablePlans && nextOverview.availablePlans.length > 0
    ? nextOverview.availablePlans
    : await getBillingPlans();

setOverview(nextOverview);
setBills(nextBills);
setPlans(nextPlans);
setPendingPaymentId(
  nextOverview.currentPayment?.status === 'PENDING'
    ? nextOverview.currentPayment.paymentId
    : null
);
```

That meant the content path and the operational path were tightly coupled.

### Example 2: Layout-first reset after

After the reset, the first goal became:

```tsx
<FloatingPageShell title="Billing" ...>
  <View style={styles.heroSection}>
    <Text style={styles.heroTitle}>Subscription Status</Text>
    <Text style={styles.heroBody}>Pull down to refresh your current subscription state.</Text>
  </View>

  <View style={styles.contentWrap}>
    <View style={styles.statusRow}>
      ...
    </View>
  </View>
</FloatingPageShell>
```

The important shift was conceptual:

- first guarantee the page has visible body content
- then layer real billing data back into that same shape

### Example 3: Temporary dashboard-card probe

One of the smartest intermediate checks was to swap in dashboard-style cards:

```tsx
<View style={styles.shortcutsGrid}>
  {dashboardShortcuts.map((item) => (
    <Pressable key={item.title} style={[styles.shortcutCard, { width: shortcutCardWidth }]}>
      <View style={styles.shortcutHeader}>
        <View style={[styles.shortcutIconWrap, shortcutIconToneStyles[item.iconTone]]}>
          <MaterialIcons color={shortcutIconColor[item.iconTone]} name={item.icon} size={28} />
        </View>
      </View>
      <Text style={styles.shortcutTitle}>{item.title}</Text>
    </Pressable>
  ))}
</View>
```

Those cards rendered correctly.

That one experiment answered a much bigger question:

The route did not need a new shell.
The billing body needed simplification.

## Why This Fix Worked

The reset worked because it changed the order of operations.

Before:

- add billing logic
- add branches
- add refresh
- add status handling
- hope the content still shows

After:

- make body content undeniably visible
- confirm the route renders static content
- use that as the baseline
- only then reintroduce data and behavior

That is a better debugging pattern for reusable page systems.

## Outcome

After the reset:

1. We proved the page shell is reusable and healthy.
2. We proved billing content can render inside it.
3. We isolated the blank-page problem to billing body complexity, not route structure.
4. We created a simpler billing baseline that can safely accept real data again.

## Files Involved

- `app/billing.tsx`
- `components/app/floating-page-shell.tsx`
- `app/covers.tsx`
- `features/billing/billing-api.ts`

## Why This Note Matters

This was not just about fixing one blank page.

It was about protecting a reusable UI system from turning into a mystery box.

When a page disappears but the shell remains, the temptation is to keep patching deeper. What helped here was doing the opposite: reduce the page until it becomes impossible to misunderstand.

That is the hook worth remembering:

When the page goes silent, make it speak with something simple first.

Then build the complexity back on top of truth.
