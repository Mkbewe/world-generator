import { useTranslation } from 'react-i18next';
import { Link2Icon, LinkBreak2Icon } from '@radix-ui/react-icons';
import { IconButton } from '@radix-ui/themes';

import { useViewSyncStore } from '../../../../../stores';

/** Toggles whether settings tabs and preview layers follow each other. */
export function TabLinkToggle() {
  const { t } = useTranslation();
  const linked = useViewSyncStore(state => state.linked);
  const setLinked = useViewSyncStore(state => state.setLinked);
  const label = t(linked ? 'tabLink.unlink' : 'tabLink.link');

  return (
    <IconButton
      size='2'
      color={linked ? 'violet' : 'gray'}
      variant={linked ? 'solid' : 'soft'}
      title={label}
      aria-label={label}
      aria-pressed={linked}
      onClick={() => setLinked(!linked)}
    >
      {linked ? <Link2Icon /> : <LinkBreak2Icon />}
    </IconButton>
  );
}
