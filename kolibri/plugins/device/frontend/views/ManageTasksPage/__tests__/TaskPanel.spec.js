import { render, screen } from '@testing-library/vue';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
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

  it('shows canceled partial export details including resource totals for a canceled disk content export task', () => {
    renderComponent(exportTask);

    expect(screen.getByText('Canceled')).toBeInTheDocument();
    expect(
      screen.getByText(/export resources from 'canceled disk export channel test'/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/started by 'tester'/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    expect(screen.getByText(/500 resources/i)).toBeInTheDocument();
    expect(screen.getByText(/\(5 KB\)/i)).toBeInTheDocument();
  });

  it('shows canceled bulk export details including resource totals for a canceled disk export task', () => {
    renderComponent({
      ...exportTask,
      type: TaskTypes.DISKEXPORT,
    });

    expect(screen.getByText('Canceled')).toBeInTheDocument();
    expect(screen.getByText(/export 'canceled disk export channel test'/i)).toBeInTheDocument();
    expect(screen.getByText(/started by 'tester'/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    expect(screen.getByText(/500 resources/i)).toBeInTheDocument();
    expect(screen.getByText(/\(5 KB\)/i)).toBeInTheDocument();
  });
});
