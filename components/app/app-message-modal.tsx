import type { StyleProp, ViewStyle } from 'react-native';

import { AppFeedbackModal, type FeedbackType } from '@/src/components/common/AppFeedbackModal';

type AppMessageModalProps = {
  message: string;
  onClose: () => void;
  title: string;
  visible: boolean;
  actionLabel?: string;
  eyebrow?: string;
  frameStyle?: StyleProp<ViewStyle>;
  tone?: Extract<FeedbackType, 'error' | 'info'>;
};

export function AppMessageModal({
  message,
  onClose,
  title,
  visible,
  actionLabel = 'Okay',
  eyebrow,
  frameStyle,
  tone = 'info',
}: AppMessageModalProps) {
  return (
    <AppFeedbackModal
      visible={visible}
      cardStyle={frameStyle}
      detailDescription={message}
      detailTitle={tone === 'error' ? 'Action needed' : 'Update'}
      dismissOnBackdropPress
      label={eyebrow}
      onClose={onClose}
      onPrimaryAction={onClose}
      primaryActionLabel={actionLabel}
      title={title}
      type={tone}
    />
  );
}
