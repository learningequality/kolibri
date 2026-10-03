import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../../store';
import { deviceStrings } from '../../commonDeviceStrings';
import ManageTasksPage, { pageTitleStrings } from '../index';
import router from '../../__tests__/testRouter';

const { statusFailed$, statusComplete$, statusInProgress$, statusCanceled$ } = deviceStrings;

function task(status, channel_name, percentage = 0) {
  return {
    id: `${status}-${channel_name}`,
    type: TaskTypes.REMOTECONTENTIMPORT,
    status,
    percentage,
    scheduled_datetime: '2026-01-01T00:00:00Z',
    extra_metadata: { channel_name },
  };
}

describe('ManageTasksPage', () => {
  it.each([
    [
      'one failed task',
      [task('FAILED', 'Alpha'), task('COMPLETED', 'Beta')],
      () => [statusFailed$(), 'Alpha'],
    ],
    [
      'several failed tasks',
      [task('FAILED', 'Alpha'), task('FAILED', 'Beta')],
      () => ['2', statusFailed$()],
    ],
    ['a lone running task', [task('RUNNING', 'Alpha', 0.5)], () => ['50%', 'Alpha']],
    [
      'several tasks, some running',
      [task('RUNNING', 'Alpha', 0.5), task('RUNNING', 'Beta', 1), task('COMPLETED', 'Gamma')],
      () => ['75%', statusInProgress$()],
    ],
    [
      'several running tasks all at 100%',
      [task('RUNNING', 'Alpha', 1), task('RUNNING', 'Beta', 1)],
      () => [statusComplete$()],
    ],
    [
      'all tasks completed',
      [task('COMPLETED', 'Alpha'), task('COMPLETED', 'Beta')],
      () => [statusComplete$()],
    ],
    [
      'some tasks canceled',
      [task('CANCELED', 'Alpha'), task('COMPLETED', 'Beta')],
      () => [statusCanceled$()],
    ],
    ['no tasks', [], () => [pageTitleStrings.appBarTitle$()]],
  ])('titles the tab for %s once the task list changes', async (_, taskList, titleParts) => {
    store.commit('manageContent/SET_TASK_LIST', [task('QUEUED', 'Initial')]);
    pageLoading.value = false;
    render(ManageTasksPage, { store, ...router });
    await nextTick();
    store.commit('manageContent/SET_TASK_LIST', taskList);
    await nextTick();
    expect(document.title).toBe([...titleParts(), 'Kolibri'].join(' - '));
  });

  it('titles the tab "Task manager" on arrival with tasks already loaded, with one h1', async () => {
    store.commit('manageContent/SET_TASK_LIST', [task('COMPLETED', 'Alpha')]);
    pageLoading.value = false;
    render(ManageTasksPage, { store, ...router });
    await nextTick();
    expect(document.title).toBe([pageTitleStrings.appBarTitle$(), 'Kolibri'].join(' - '));
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
