import { mount } from '@vue/test-utils';
import TaskPanel from '../TaskPanel';

function makeWrapper(propsData) {
  const wrapper = mount(TaskPanel, { propsData });
  return { wrapper };
}

describe('TaskPanel', () => {
  const exportTask = {
    type: 'DISKCONTENTEXPORT',
    status: 'CANCELED',
    channel_name: 'Canceled disk export channel test',
    started_by_username: 'Tester',
    file_size: 5000,
    total_resources: 500,
  };

  it('renders correctly when it is a canceled DISKCONTENTEXPORT task', () => {
    const { wrapper } = makeWrapper({ task: exportTask });
    // File size/resource numbers should not be shown for canceled exports
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders correctly when it is a canceled DISKEXPORT task (bulk export)', () => {
    const { wrapper } = makeWrapper({ task: { ...exportTask, type: 'DISKEXPORT' } });
    expect(wrapper.html()).toMatchSnapshot();
  });
});
