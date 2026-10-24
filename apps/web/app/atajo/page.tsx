import { SHORTCUT_SCRIPT } from '@cesta/connectors/shortcut';
import { ShortcutGuide } from '@/components/ShortcutGuide';

export const metadata = { title: 'Atajo · Cesta Mallorca' };

export default function AtajoPage() {
  return <ShortcutGuide script={SHORTCUT_SCRIPT} />;
}
