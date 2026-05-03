import type { MaterialIcons } from '@expo/vector-icons';

export type CoverSummaryCard = {
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  label: string;
  title: string;
};

export type CoverListItem = {
  dueDate: string;
  id: string;
  provider: string;
  status: 'ACTIVE' | 'DUE' | 'LAPSED';
  title: string;
  type: string;
};

export const coverSummaryCards: CoverSummaryCard[] = [
  {
    count: '28',
    icon: 'shield',
    iconTone: 'primary',
    label: 'All Policies',
    title: 'Total',
  },
  {
    count: '19',
    icon: 'verified-user',
    iconTone: 'secondary',
    label: 'Protected',
    title: 'Active',
  },
  {
    count: '6',
    icon: 'event',
    iconTone: 'tertiary',
    label: 'Renewals',
    title: 'Due',
  },
  {
    count: '3',
    icon: 'gpp-bad',
    iconTone: 'neutral',
    label: 'Needs Attention',
    title: 'Lapsed',
  },
];

export const coverList: CoverListItem[] = [
  {
    dueDate: '12 May 2026',
    id: 'cover-1',
    provider: 'Jubilee Health',
    status: 'ACTIVE',
    title: 'Family Medical Cover',
    type: 'Medical',
  },
  {
    dueDate: '21 May 2026',
    id: 'cover-2',
    provider: 'Britam General',
    status: 'DUE',
    title: 'Commercial Vehicle Cover',
    type: 'Motor',
  },
  {
    dueDate: '01 Apr 2026',
    id: 'cover-3',
    provider: 'Old Mutual Life',
    status: 'LAPSED',
    title: 'Executive Life Assurance',
    type: 'Life',
  },
  {
    dueDate: '30 Jun 2026',
    id: 'cover-4',
    provider: 'APA Insurance',
    status: 'ACTIVE',
    title: 'SME Asset Protection',
    type: 'Business',
  },
];
