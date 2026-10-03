import { render, screen } from '@testing-library/vue';
import { SyncStatus } from 'kolibri/constants';
import { createTranslator } from 'kolibri/utils/i18n';
import SyncStatusDisplay from '../SyncStatusDisplay';

const strings = createTranslator(SyncStatusDisplay.name, SyncStatusDisplay.$trs);

function renderComponent(props = {}) {
  return render(SyncStatusDisplay, { props });
}

describe('SyncStatusDisplay', () => {
  it.each([
    [SyncStatus.SYNCING, 'syncing'],
    [SyncStatus.QUEUED, 'queued'],
  ])('shows a spinner and text while the status is %s', (syncStatus, key) => {
    renderComponent({ syncStatus });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(strings[`${key}$`]())).toBeInTheDocument();
  });

  it.each([
    [SyncStatus.NOT_CONNECTED, 'notConnected'],
    [SyncStatus.UNABLE_TO_SYNC, 'unableToSync'],
    [SyncStatus.INSUFFICIENT_STORAGE, 'insufficientStorage'],
  ])('shows an icon and text, without a spinner, when the status is %s', (syncStatus, key) => {
    renderComponent({ syncStatus });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('syncStatusIcon')).toBeInTheDocument();
    expect(screen.getByText(strings[`${key}$`]())).toBeInTheDocument();
  });

  it('shows "Synced" when the last sync just happened', () => {
    renderComponent({ syncStatus: SyncStatus.RECENTLY_SYNCED, lastSynced: new Date() });
    expect(screen.getByText(strings.recentlySynced$())).toBeInTheDocument();
  });

  it('shows how long ago the last sync was when it was not just now', () => {
    renderComponent({
      syncStatus: SyncStatus.RECENTLY_SYNCED,
      lastSynced: new Date(Date.now() - 5 * 60 * 1000),
    });
    expect(screen.getByTestId('syncStatusText')).toHaveTextContent(/ago$/);
    expect(screen.queryByText(strings.recentlySynced$())).not.toBeInTheDocument();
  });
});
