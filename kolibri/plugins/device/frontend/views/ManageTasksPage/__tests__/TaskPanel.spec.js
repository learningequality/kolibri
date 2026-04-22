import { render, screen } from '@testing-library/vue';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { deviceStrings } from '../../commonDeviceStrings';

import TaskPanel from '../TaskPanel';

const { clearAction$ } = coreStrings;
const { statusCanceled$ } = deviceStrings;

const { exportChannelPartial$, exportChannelWhole$, startedByUser$, numResourcesAndSize$ } =
  createTranslator(TaskPanel.name, TaskPanel.$trs);

const EXPORT_TASK = {
  type: TaskTypes.DISKCONTENTEXPORT,
  status: 'CANCELED',
  clearable: true,
  extra_metadata: {
    channel_name: 'Canceled disk export channel test',
    started_by_username: 'Tester',
    file_size: 5000,
    total_resources: 500,
  },
};
const FILE_SIZE = '5 KB';

function renderComponent(task) {
  return render(TaskPanel, {
    props: {
      task,
    },
  });
}

describe('TaskPanel', () => {
  it('shows canceled partial export details including resource totals for a canceled disk content export task', () => {
    const { channel_name, started_by_username, total_resources } = EXPORT_TASK.extra_metadata;
    renderComponent(EXPORT_TASK);

    expect(screen.getByText(statusCanceled$())).toBeInTheDocument();
    expect(
      screen.getByText(exportChannelPartial$({ channelName: channel_name })),
    ).toBeInTheDocument();
    expect(screen.getByText(startedByUser$({ user: started_by_username }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: clearAction$() })).toBeInTheDocument();
    expect(
      screen.getByText(
        numResourcesAndSize$({ numResources: total_resources, bytesText: FILE_SIZE }),
      ),
    ).toBeInTheDocument();
  });

  it('shows canceled bulk export details including resource totals for a canceled disk export task', () => {
    const { channel_name, started_by_username, total_resources } = EXPORT_TASK.extra_metadata;
    renderComponent({ ...EXPORT_TASK, type: TaskTypes.DISKEXPORT });

    expect(screen.getByText(statusCanceled$())).toBeInTheDocument();
    expect(
      screen.getByText(exportChannelWhole$({ channelName: channel_name })),
    ).toBeInTheDocument();
    expect(screen.getByText(startedByUser$({ user: started_by_username }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: clearAction$() })).toBeInTheDocument();
    expect(
      screen.getByText(
        numResourcesAndSize$({ numResources: total_resources, bytesText: FILE_SIZE }),
      ),
    ).toBeInTheDocument();
  });
});
