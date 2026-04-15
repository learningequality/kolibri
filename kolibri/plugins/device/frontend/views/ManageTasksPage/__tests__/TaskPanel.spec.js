import { render, screen } from '@testing-library/vue';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { deviceString } from '../../commonDeviceStrings';
import TaskPanel from '../TaskPanel';

function renderComponent(task) {
  return render(TaskPanel, {
    props: {
      task,
    },
  });
}

describe('TaskPanel', () => {
  const exportTask = {
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

  const CHANNEL_NAME = exportTask.extra_metadata.channel_name;
  const USERNAME = exportTask.extra_metadata.started_by_username;
  const TOTAL_RESOURCES = exportTask.extra_metadata.total_resources;

  const startedByPattern = new RegExp(`started by '${USERNAME}'`, 'i');
  const resourcesPattern = new RegExp(`${TOTAL_RESOURCES} resources`, 'i');
  const fileSizePattern = /\(5 KB\)/i;

  it('shows canceled partial export details including resource totals for a canceled disk content export task', () => {
    const partialExportPattern = new RegExp(`export resources from '${CHANNEL_NAME}'`, 'i');

    renderComponent(exportTask);

    expect(screen.getByText(deviceString('statusCanceled'))).toBeInTheDocument();
    expect(screen.getByText(partialExportPattern)).toBeInTheDocument();
    expect(screen.getByText(startedByPattern)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('clearAction') })).toBeInTheDocument();

    expect(screen.getByText(resourcesPattern)).toBeInTheDocument();
    expect(screen.getByText(fileSizePattern)).toBeInTheDocument();
  });

  it('shows canceled bulk export details including resource totals for a canceled disk export task', () => {
    const bulkExportPattern = new RegExp(`export '${CHANNEL_NAME}'`, 'i');

    renderComponent({
      ...exportTask,
      type: TaskTypes.DISKEXPORT,
    });

    expect(screen.getByText(deviceString('statusCanceled'))).toBeInTheDocument();
    expect(screen.getByText(bulkExportPattern)).toBeInTheDocument();
    expect(screen.getByText(startedByPattern)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('clearAction') })).toBeInTheDocument();

    expect(screen.getByText(resourcesPattern)).toBeInTheDocument();
    expect(screen.getByText(fileSizePattern)).toBeInTheDocument();
  });
});
