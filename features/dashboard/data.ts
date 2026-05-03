import type { MaterialIcons } from '@expo/vector-icons';

export type DashboardShortcut = {
  badge: string;
  badgeTone: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  eyebrow: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  title: string;
};

export type ActivityItem = {
  id: string;
  meta: string;
  statusLabel?: string;
  statusTone?: 'success';
  title: string;
  type: 'contracts' | 'support' | 'tasks';
};

export type BottomNavItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  key: string;
  label: string;
};

export const dashboardShortcuts: DashboardShortcut[] = [
  {
    badge: '12',
    badgeTone: 'primary',
    eyebrow: 'Overview',
    icon: 'assignment',
    iconTone: 'primary',
    title: 'Tasks',
  },
  {
    badge: '5',
    badgeTone: 'secondary',
    eyebrow: 'Active',
    icon: 'description',
    iconTone: 'secondary',
    title: 'Contracts',
  },
  {
    badge: '8',
    badgeTone: 'tertiary',
    eyebrow: 'Policies',
    icon: 'shield',
    iconTone: 'tertiary',
    title: 'Insurance',
  },
  {
    badge: '2',
    badgeTone: 'neutral',
    eyebrow: 'Tickets',
    icon: 'contact-support',
    iconTone: 'neutral',
    title: 'Support',
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: 'task-assigned',
    meta: '2 hours ago - Project Alpha',
    title: 'New task assigned',
    type: 'tasks',
  },
  {
    id: 'contract-signed',
    meta: 'Yesterday - Q4 Partnerships',
    title: 'Contract signed by Global Retailers',
    type: 'contracts',
  },
  {
    id: 'ticket-fixed',
    meta: 'Oct 24 - ID: #44920',
    statusLabel: 'FIXED',
    statusTone: 'success',
    title: 'Support ticket resolved',
    type: 'support',
  },
];

export const bottomNavItems: BottomNavItem[] = [
  { icon: 'home-filled', key: 'home', label: 'Home' },
  { icon: 'assignment', key: 'tasks', label: 'Tasks' },
  { icon: 'description', key: 'contracts', label: 'Contracts' },
  { icon: 'shield', key: 'covers', label: 'Covers' },
  { icon: 'more-horiz', key: 'more', label: 'More' },
];
