import { render, screen } from '@testing-library/vue';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import useDownloadRequests from '../../../../composables/useDownloadRequests';
import DownloadsList from '../index.vue';

jest.mock('../../../../composables/useContentLink');
jest.mock('../../../../composables/useDevices');
jest.mock('../../../../composables/useDownloadRequests');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: () => ({ windowIsLarge: true }),
}));

const DOWNLOAD_TITLE = 'A multi-activity resource';
const routes = [{ path: '/', name: 'downloads' }];

describe('DownloadsList', () => {
  it('renders an icon for a download with multiple learning activities', () => {
    useDownloadRequests.mockReturnValue({
      downloadRequestMap: {
        'content-node-id': {
          contentnode_id: 'content-node-id',
          metadata: {
            title: DOWNLOAD_TITLE,
            learning_activities: [LearningActivities.WATCH, LearningActivities.READ],
          },
          requested_at: '2026-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
      },
    });

    render(DownloadsList, { routes });

    const downloadLabel = screen.getByText(DOWNLOAD_TITLE);
    expect(downloadLabel.closest('.labeled-icon-wrapper').querySelector('svg')).toBeInTheDocument();
  });
});
