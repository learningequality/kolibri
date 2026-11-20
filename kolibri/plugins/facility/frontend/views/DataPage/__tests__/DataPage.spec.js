import { render, screen, waitFor, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import client from 'kolibri/client';
import useFacility from 'kolibri-common/composables/useFacility';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import makeStore from '../../../__tests__/utils/makeStore';
import { PageNames } from '../../../constants';
import ImportInterface from '../ImportInterface';
import SyncInterface from '../SyncInterface';
import DataPage, { pageTitleStrings } from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri-plugin-data', () => ({
  urls: {
    urls: {
      'kolibri:core:facility_detail': [['api/auth/facility/%(pk)s/', ['pk']]],
      'kolibri:core:facility_list': [['api/auth/facility/', []]],
      'kolibri:core:facilitydataset_list': [['api/auth/facilitydataset/', []]],
      'kolibri:core:task_list': [['api/tasks/tasks/', []]],
      'kolibri:core:task_clear': [['api/tasks/tasks/%(pk)s/clear/', ['pk']]],
      'kolibri:core:generatecsvlogrequest_list': [['api/logger/generatecsvlogrequest/', []]],
      'kolibri:kolibri.plugins.facility:exportedcsvinfo': [
        ['facility/api/exportedcsvinfo/%(facility_id)s/', ['facility_id']],
      ],
      'kolibri:kolibri.plugins.facility:firstlogdate': [
        ['facility/api/firstlogdate/%(facility_id)s/', ['facility_id']],
      ],
      'kolibri:kolibri.plugins.facility:download_csv_file': [
        ['facility/api/downloadcsvfile/%(csv_type)s/%(facility_id)s/', ['csv_type', 'facility_id']],
      ],
    },
  },
}));

const { documentTitle$ } = pageTitleStrings;
const { pageHeading$, download$ } = createTranslator(DataPage.name, DataPage.$trs);
const {
  sectionTitle$,
  generateCSV$,
  regenerateCSV$,
  generatingCSV$,
  downloadCSV$,
  csvReady$,
  csvExportFailed$,
} = createTranslator(ImportInterface.name, ImportInterface.$trs);
const { syncData$ } = createTranslator(SyncInterface.name, SyncInterface.$trs);
const queuedExport = {
  id: 'export',
  facility_id: 'facility-1',
  type: TaskTypes.EXPORTUSERSTOCSV,
  status: TaskStatuses.QUEUED,
};
const retryExport = { ...queuedExport, id: 'retry' };
const runningSummaryExport = {
  ...queuedExport,
  id: 'summary',
  type: TaskTypes.EXPORTSUMMARYLOGCSV,
  status: TaskStatuses.RUNNING,
};
const existingUserDate = '2024-10-27T03:33:20+00:00';
const postTask = jest.fn();
const clearTask = jest.fn();
const listTasks = jest.fn();
const fileInfo = jest.fn();
const listFacilities = jest.fn();
const taskUrl = '/api/tasks/tasks/';

function pollWithTasks(...tasks) {
  listTasks.mockResolvedValueOnce({ data: tasks });
}

function expectDownload(click, csvType, facility) {
  expect(click).toHaveBeenCalledTimes(1);
  const [link] = click.mock.instances;
  expect(link).toHaveAttribute('download');
  expect(link).toHaveAttribute('href', `/facility/api/downloadcsvfile/${csvType}/${facility}/`);
}

async function renderPage(store, component = ImportInterface) {
  const router = new VueRouter({
    routes: [
      { path: '/data', name: PageNames.DATA_EXPORT_PAGE },
      { path: '/data/import', name: PageNames.IMPORT_CSV_PAGE },
    ],
  });
  await router.push({ name: PageNames.DATA_EXPORT_PAGE });
  return render(component, { store, router });
}

describe('DataPage', () => {
  let store;
  let downloadLink;

  beforeEach(async () => {
    store = makeStore();
    store.commit('manageCSV/RESET_STATE');
    postTask.mockReset().mockResolvedValue({ data: queuedExport });
    clearTask.mockReset().mockResolvedValue({ data: [] });
    listTasks.mockReset().mockResolvedValue({ data: [] });
    listFacilities.mockReset().mockResolvedValue({ data: [] });
    fileInfo.mockReset().mockResolvedValue({ data: { user: null, session: null, summary: null } });
    downloadLink = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    client.mockReset().mockImplementation(async ({ method = 'GET', url, data }) => {
      if (method === 'POST' && url === taskUrl) {
        const response = await postTask(data);
        expect(data.type).toBe(response.data.type);
        return response;
      }
      if (method === 'GET' && url === taskUrl) {
        return listTasks();
      }
      if (method === 'GET' && /^\/facility\/api\/exportedcsvinfo\/facility-[12]\/$/.test(url)) {
        return fileInfo();
      }
      if (method === 'GET' && /^\/facility\/api\/firstlogdate\/facility-[12]\/$/.test(url)) {
        return { data: { first_log_date: '2025-01-01' } };
      }
      const facilityMatch = /^\/api\/auth\/facility\/(facility-[12])\/$/.exec(url);
      if (method === 'GET' && facilityMatch) {
        return { data: { id: facilityMatch[1], name: 'Facility', dataset: { registered: false } } };
      }
      if (method === 'POST' && /^\/api\/tasks\/tasks\/[^/]+\/clear\/$/.test(url)) {
        return clearTask(url);
      }
      if (method === 'GET' && url === '/api/auth/facility/') {
        return listFacilities();
      }
      if (
        method === 'GET' &&
        ['/api/auth/facilitydataset/', '/api/logger/generatecsvlogrequest/'].includes(url)
      ) {
        return { data: [] };
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    await useFacility().setFacilityId('facility-1');
  });

  afterEach(() => {
    downloadLink.mockRestore();
    jest.useRealTimers();
  });

  it('keeps existing CSVs downloadable while the facility list loads on return', async () => {
    fileInfo.mockResolvedValue({
      data: { user: existingUserDate, session: existingUserDate, summary: existingUserDate },
    });
    const { unmount } = await renderPage(store, DataPage);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: download$() })).toHaveLength(2),
    );
    unmount();

    let resolveFacilities;
    listFacilities.mockReturnValueOnce(
      new Promise(resolve => {
        resolveFacilities = resolve;
      }),
    );
    await renderPage(store, DataPage);
    try {
      await userEvent.click(screen.getByRole('button', { name: downloadCSV$() }));
      expectDownload(downloadLink, 'user', 'facility-1');
      const logDownloads = screen.getAllByRole('button', { name: download$() });
      for (const [index, type] of ['session', 'summary'].entries()) {
        downloadLink.mockClear();
        await userEvent.click(logDownloads[index]);
        expectDownload(downloadLink, type, 'facility-1');
      }
    } finally {
      resolveFacilities({ data: [] });
      await global.flushPromises();
    }
  });

  it('does not enqueue a second export while the facility list loads after remount', async () => {
    const { unmount } = await renderPage(store, DataPage);
    await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
    await global.flushPromises();
    expect(postTask).toHaveBeenCalledTimes(1);
    unmount();

    let resolveFacilities;
    listFacilities.mockReturnValueOnce(
      new Promise(resolve => {
        resolveFacilities = resolve;
      }),
    );
    await renderPage(store, DataPage);
    try {
      await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
      expect(postTask).toHaveBeenCalledTimes(1);
    } finally {
      resolveFacilities({ data: [] });
      await global.flushPromises();
    }
  });

  it('shares a pending task-list request between Data and Import', async () => {
    let resolveList;
    listTasks.mockReturnValueOnce(
      new Promise(resolve => {
        resolveList = resolve;
      }),
    );
    const exportPoll = store.dispatch('manageCSV/refreshTaskList');
    const importPoll = store.dispatch('importCSV/refreshTaskList');
    const queuedImport = { ...queuedExport, id: 'import', type: TaskTypes.IMPORTUSERSFROMCSV };
    try {
      expect(listTasks).toHaveBeenCalledTimes(1);
    } finally {
      resolveList({ data: [queuedExport, queuedImport] });
      await Promise.all([exportPoll, importPoll]);
    }
    expect(store.getters['manageCSV/exportingUsers']).toBe(true);
    expect(store.getters['importCSV/taskId']).toBe(queuedImport.id);
  });

  it('updates the live region for each identical enqueue rejection', async () => {
    postTask.mockRejectedValue({ response: { status: 400 } });
    await renderPage(store);
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const notice = screen.getByTestId('user-export-status');
    await userEvent.click(generate);
    await waitFor(() => expect(notice).toHaveTextContent(csvExportFailed$()));

    const firstMessage = notice.firstElementChild;
    expect(firstMessage).toHaveTextContent(csvExportFailed$());
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(firstMessage).not.toBeInTheDocument());
    expect(notice.firstElementChild).toHaveTextContent(csvExportFailed$());
  });

  it('titles the tab "Manage Data" with a hidden h1, its sections as h2s', async () => {
    document.title = '';
    await renderPage(store, DataPage);
    await waitFor(() => expect(document.title).toBe(`${documentTitle$()} - Kolibri`));
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(documentTitle$());
    expect(headings[0]).toHaveClass('visuallyhidden');
    for (const name of [pageHeading$(), sectionTitle$(), syncData$()]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('announces a failed user export without moving focus or enabling Download', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderPage(store, DataPage);
    await jest.advanceTimersByTimeAsync(0);
    const notice = screen.getByTestId('user-export-status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
    expect(notice).toHaveAttribute('dir', 'auto');
    expect(notice).toBeEmptyDOMElement();
    const download = screen.getByRole('button', { name: downloadCSV$() });
    expect(download).toBeDisabled();
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const exportControls = within(generate.parentElement);
    await user.click(generate);
    expect(await exportControls.findByRole('progressbar')).toBeInTheDocument();
    expect(download).toBeDisabled();
    const message = 'Facility with ID facility-1 does not exist';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    });
    await jest.advanceTimersByTimeAsync(1000);
    expect(fileInfo).toHaveBeenCalledTimes(1);
    expect(clearTask.mock.calls).toEqual([['/api/tasks/tasks/export/clear/']]);
    expect(notice).toHaveTextContent(message);
    expect(notice).toHaveAttribute('aria-live', 'polite');
    expect(exportControls.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(notice).not.toHaveClass('visuallyhidden');
    expect(notice).toBeVisible();
    expect(generate).toHaveFocus();
    expect(download).toBeDisabled();
    await jest.advanceTimersByTimeAsync(1000);
    expect(fileInfo).toHaveBeenCalledTimes(1);
    postTask.mockResolvedValueOnce({ data: retryExport });
    await user.click(generate);
    expect(await exportControls.findByRole('progressbar')).toBeInTheDocument();
    pollWithTasks({ ...retryExport, status: TaskStatuses.RUNNING });
    await jest.advanceTimersByTimeAsync(1000);
    expect(notice).toHaveTextContent(generatingCSV$());
    expect(generate).toHaveFocus();
  });

  it('queues only one export when Generate is clicked twice before the response', async () => {
    await renderPage(store);
    let resolveEnqueue;
    postTask.mockReturnValueOnce(
      new Promise(resolve => {
        resolveEnqueue = resolve;
      }),
    );
    const generate = screen.getByRole('button', { name: generateCSV$() });
    await userEvent.click(generate);
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(1);

    resolveEnqueue({ data: queuedExport });
    await global.flushPromises();
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.COMPLETED,
      extra_metadata: { filename: 'users.csv' },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(screen.getByRole('button', { name: downloadCSV$() })).toBeEnabled();
    expect(screen.getByTestId('user-export-status')).toHaveTextContent(csvReady$());
  });

  it('keeps the retry failure visible when the original enqueue response arrives late', async () => {
    await renderPage(store);
    let resolveEnqueue;
    postTask.mockReturnValueOnce(
      new Promise(resolve => {
        resolveEnqueue = resolve;
      }),
    );
    const enqueue = store.dispatch('manageCSV/startExportUsers');
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const exportControls = within(generate.parentElement);
    const notice = screen.getByTestId('user-export-status');

    pollWithTasks({ ...queuedExport, status: TaskStatuses.RUNNING });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(exportControls.getByRole('progressbar')).toBeInTheDocument();

    const message = 'Facility no longer exists';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(message);

    postTask.mockResolvedValueOnce({ data: retryExport });
    await userEvent.click(generate);
    const retryMessage = 'The retry failed';
    pollWithTasks({
      ...retryExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [retryMessage] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(retryMessage);

    resolveEnqueue({ data: queuedExport });
    await enqueue;
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(retryMessage);
    expect(exportControls.queryByRole('progressbar')).not.toBeInTheDocument();

    postTask.mockResolvedValueOnce({ data: { ...retryExport, id: 'next-retry' } });
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(3);
    expect(exportControls.getByRole('progressbar')).toBeInTheDocument();
    expect(notice).toHaveTextContent(generatingCSV$());
  });

  it('keeps the pending retry guarded when an older enqueue fails', async () => {
    await renderPage(store);
    let rejectOlderEnqueue;
    let rejectNewerEnqueue;
    postTask
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            rejectOlderEnqueue = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            rejectNewerEnqueue = reject;
          }),
      );
    const olderEnqueue = store.dispatch('manageCSV/startExportUsers');
    pollWithTasks({ ...queuedExport, status: TaskStatuses.RUNNING });
    await store.dispatch('manageCSV/refreshTaskList');
    const message = 'Facility no longer exists';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    const newerEnqueue = store.dispatch('manageCSV/startExportUsers');
    const notice = screen.getByTestId('user-export-status');

    rejectOlderEnqueue(new Error('Older request failed'));
    await olderEnqueue;
    try {
      expect(notice).toHaveTextContent(message);
      await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
      expect(postTask).toHaveBeenCalledTimes(2);
    } finally {
      rejectNewerEnqueue(new Error('Newer request failed'));
      await newerEnqueue;
    }
    expect(notice).toHaveTextContent(csvExportFailed$());
  });

  it('allows another retry after a rejected enqueue while the original response is pending', async () => {
    await renderPage(store);
    let rejectEnqueue;
    postTask.mockReturnValueOnce(
      new Promise((resolve, reject) => {
        rejectEnqueue = reject;
      }),
    );
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const notice = screen.getByTestId('user-export-status');
    await userEvent.click(generate);
    pollWithTasks({ ...queuedExport, status: TaskStatuses.RUNNING });
    await store.dispatch('manageCSV/refreshTaskList');
    pollWithTasks({ ...queuedExport, status: TaskStatuses.FAILED });
    await store.dispatch('manageCSV/refreshTaskList');
    postTask.mockRejectedValueOnce(new Error('Retry request failed'));
    await userEvent.click(generate);
    await global.flushPromises();
    expect(postTask).toHaveBeenCalledTimes(2);

    postTask.mockResolvedValueOnce({ data: retryExport });
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(3);

    pollWithTasks({
      ...retryExport,
      status: TaskStatuses.COMPLETED,
      extra_metadata: { filename: 'users.csv' },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(csvReady$());

    rejectEnqueue(new Error('Older request failed'));
    await global.flushPromises();
    expect(notice).toHaveTextContent(csvReady$());
  });

  it('keeps a detailed worker failure visible when enqueue fails late', async () => {
    await renderPage(store);
    let rejectEnqueue;
    postTask.mockReturnValueOnce(
      new Promise((resolve, reject) => {
        rejectEnqueue = reject;
      }),
    );
    const enqueue = store.dispatch('manageCSV/startExportUsers');
    const notice = screen.getByTestId('user-export-status');

    pollWithTasks({ ...queuedExport, status: TaskStatuses.RUNNING });
    await store.dispatch('manageCSV/refreshTaskList');
    const message = 'Facility no longer exists';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(message);

    rejectEnqueue(new Error('Enqueue response failed'));
    await enqueue;
    expect(notice).toHaveTextContent(message);
  });

  it('enables Download when an export enqueued before remount finishes', async () => {
    const { unmount } = await renderPage(store, DataPage);
    await global.flushPromises();
    let resolveEnqueue;
    postTask.mockReturnValueOnce(
      new Promise(resolve => {
        resolveEnqueue = resolve;
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
    expect(postTask).toHaveBeenCalledTimes(1);
    unmount();

    fileInfo.mockClear();
    await renderPage(store, DataPage);
    await global.flushPromises();
    expect(fileInfo).toHaveBeenCalledTimes(1);
    const download = screen.getByRole('button', { name: downloadCSV$() });
    expect(download).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
    expect(postTask).toHaveBeenCalledTimes(1);

    resolveEnqueue({ data: queuedExport });
    await global.flushPromises();
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.COMPLETED,
      extra_metadata: { filename: 'users.csv' },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(download).toBeEnabled();
  });

  it('queues an export for another facility while the first enqueue is pending', async () => {
    let resolveFirstEnqueue;
    let resolveSecondEnqueue;
    postTask
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirstEnqueue = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveSecondEnqueue = resolve;
        }),
      );

    const { unmount } = await renderPage(store, DataPage);
    await userEvent.click(screen.getByRole('button', { name: generateCSV$() }));
    unmount();

    await useFacility().setFacilityId('facility-2');
    await renderPage(store, DataPage);
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const exportControls = within(generate.parentElement);
    await userEvent.click(generate);
    expect(postTask.mock.calls.map(([data]) => data.facility)).toEqual([
      'facility-1',
      'facility-2',
    ]);

    resolveFirstEnqueue({ data: queuedExport });
    await global.flushPromises();
    expect(exportControls.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(2);

    resolveSecondEnqueue({ data: { ...queuedExport, id: 'export-2', facility_id: 'facility-2' } });
    expect(await exportControls.findByRole('progressbar')).toBeInTheDocument();
  });

  it('ignores the previous facility’s CSV lookup while the new facility list loads', async () => {
    let resolvePreviousLookup;
    fileInfo.mockReturnValueOnce(
      new Promise(resolve => {
        resolvePreviousLookup = resolve;
      }),
    );
    const { unmount } = await renderPage(store, DataPage);
    await global.flushPromises();
    expect(fileInfo).toHaveBeenCalledTimes(1);
    unmount();

    await useFacility().setFacilityId('facility-2');
    let resolveFacilities;
    listFacilities.mockReturnValueOnce(
      new Promise(resolve => {
        resolveFacilities = resolve;
      }),
    );
    await renderPage(store, DataPage);
    expect(screen.getByRole('button', { name: downloadCSV$() })).toBeDisabled();

    resolvePreviousLookup({ data: { user: existingUserDate } });
    await global.flushPromises();
    expect(screen.getByRole('button', { name: downloadCSV$() })).toBeDisabled();

    resolveFacilities({ data: [] });
    await global.flushPromises();
    expect(fileInfo).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: downloadCSV$() })).toBeDisabled();
    expect(screen.getByRole('button', { name: generateCSV$() })).toBeEnabled();
  });

  it('keeps a summary regeneration tracked when the user export fails', async () => {
    const previousSummary = '2025-01-01T00:00:00Z';
    const newSummary = '2025-01-02T00:00:00Z';
    fileInfo.mockResolvedValueOnce({ data: { summary: previousSummary } });
    await renderPage(store, DataPage);
    const previousDownload = await screen.findByRole('button', { name: download$() });
    const summaryControls = within(previousDownload.parentElement);

    const summaryExport = { ...queuedExport, id: 'summary', type: TaskTypes.EXPORTSUMMARYLOGCSV };
    postTask.mockResolvedValueOnce({ data: summaryExport });
    await store.dispatch('manageCSV/startSummaryCSVExport', {
      start: previousSummary,
      end: newSummary,
    });
    expect(summaryControls.getByRole('progressbar')).toBeInTheDocument();
    await store.dispatch('manageCSV/startExportUsers');

    const message = 'User CSV export failed';
    pollWithTasks(
      { ...summaryExport, status: TaskStatuses.RUNNING },
      {
        ...queuedExport,
        status: TaskStatuses.FAILED,
        extra_metadata: { overall_error: [message] },
      },
    );
    await store.dispatch('manageCSV/refreshTaskList');
    expect(screen.getByTestId('user-export-status')).toHaveTextContent(message);
    expect(summaryControls.getByRole('progressbar')).toBeInTheDocument();

    fileInfo.mockResolvedValueOnce({ data: { summary: newSummary } });
    pollWithTasks({ ...summaryExport, status: TaskStatuses.COMPLETED });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(clearTask).toHaveBeenCalledWith('/api/tasks/tasks/summary/clear/');
    expect(summaryControls.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.click(await summaryControls.findByRole('button', { name: download$() }));
    expectDownload(downloadLink, 'summary', 'facility-1');
  });

  it.each([
    ['before the export starts', true],
    ['while the export is running', false],
  ])(
    'keeps tracking a running export when a lookup started %s resolves',
    async (_, beforeStart) => {
      const fileResponse = { data: { user: existingUserDate } };
      fileInfo.mockResolvedValueOnce(fileResponse);
      await store.dispatch('manageCSV/getExportedCSVsInfo');
      await renderPage(store);

      let resolveLookup;
      fileInfo.mockReturnValueOnce(
        new Promise(resolve => {
          resolveLookup = resolve;
        }),
      );
      const initialLookup = beforeStart ? store.dispatch('manageCSV/getExportedCSVsInfo') : null;
      const regenerate = screen.getByRole('button', { name: regenerateCSV$() });
      const controls = within(regenerate.parentElement);
      const notice = screen.getByTestId('user-export-status');
      await userEvent.click(regenerate);
      pollWithTasks({ ...queuedExport, status: TaskStatuses.RUNNING });
      await store.dispatch('manageCSV/refreshTaskList');
      const lookup = initialLookup || store.dispatch('manageCSV/getExportedCSVsInfo');
      resolveLookup(fileResponse);
      await lookup;

      expect(controls.getByRole('progressbar')).toBeInTheDocument();
      expect(notice).toHaveTextContent(generatingCSV$());
      expect(controls.getByRole('button', { name: downloadCSV$() })).toBeEnabled();

      const message = 'Facility no longer exists';
      pollWithTasks({
        ...queuedExport,
        status: TaskStatuses.FAILED,
        extra_metadata: { overall_error: [message] },
      });
      await store.dispatch('manageCSV/refreshTaskList');
      expect(controls.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(notice).toHaveTextContent(message);
    },
  );

  it('announces completion after a tracked export finishes, not after an empty poll', async () => {
    await renderPage(store);
    const notice = screen.getByTestId('user-export-status');
    await userEvent.click(await screen.findByRole('button', { name: generateCSV$() }));
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(generatingCSV$());

    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.COMPLETED,
      extra_metadata: { filename: 'users.csv' },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(csvReady$());
    expect(screen.getByRole('button', { name: downloadCSV$() })).toBeEnabled();
  });

  it('can regenerate when a fresh poll loses the first export before the initial lookup resolves', async () => {
    let resolveInitialLookup;
    fileInfo.mockReturnValueOnce(
      new Promise(resolve => {
        resolveInitialLookup = resolve;
      }),
    );
    await renderPage(store, DataPage);
    await global.flushPromises();
    expect(fileInfo).toHaveBeenCalledTimes(1);

    const generate = screen.getByRole('button', { name: generateCSV$() });
    const exportControls = within(generate.parentElement);
    await userEvent.click(generate);
    expect(exportControls.getByRole('progressbar')).toBeInTheDocument();

    const fileResponse = { data: { user: existingUserDate } };
    fileInfo.mockResolvedValue(fileResponse);
    await store.dispatch('manageCSV/refreshTaskList');
    resolveInitialLookup(fileResponse);
    await global.flushPromises();

    expect(exportControls.getByRole('button', { name: downloadCSV$() })).toBeEnabled();
    expect(screen.getByTestId('user-export-status')).toBeEmptyDOMElement();
    await userEvent.click(exportControls.getByRole('button', { name: regenerateCSV$() }));
    expect(postTask).toHaveBeenCalledTimes(2);
  });

  it('keeps regeneration tracked when an older summary poll omits the user export', async () => {
    fileInfo.mockResolvedValueOnce({ data: { user: existingUserDate } });
    await store.dispatch('manageCSV/getExportedCSVsInfo');
    await renderPage(store);
    const regenerate = screen.getByRole('button', { name: regenerateCSV$() });
    const controls = within(regenerate.parentElement);
    const notice = screen.getByTestId('user-export-status');
    pollWithTasks(runningSummaryExport);
    await store.dispatch('manageCSV/refreshTaskList');

    let resolveList;
    listTasks.mockReturnValueOnce(
      new Promise(resolve => {
        resolveList = resolve;
      }),
    );
    const earlierPoll = store.dispatch('manageCSV/refreshTaskList');
    await userEvent.click(regenerate);
    expect(controls.getByRole('progressbar')).toBeInTheDocument();
    const laterPoll = store.dispatch('manageCSV/refreshTaskList');
    expect(listTasks).toHaveBeenCalledTimes(2);

    fileInfo.mockResolvedValueOnce({ data: { user: existingUserDate } });
    resolveList({ data: [{ ...runningSummaryExport, status: TaskStatuses.COMPLETED }] });
    await Promise.all([earlierPoll, laterPoll]);
    await global.flushPromises();
    expect(fileInfo).toHaveBeenCalledTimes(2);

    const message = 'User CSV regeneration failed';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(message);
    expect(controls.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(regenerate).toBeEnabled();
  });

  it('keeps the existing CSV downloadable after a failed regeneration', async () => {
    fileInfo.mockResolvedValueOnce({ data: { user: existingUserDate } });
    await store.dispatch('manageCSV/getExportedCSVsInfo');
    expect(store.state.manageCSV.exportUsersDateCreated).toEqual(new Date(existingUserDate));
    await renderPage(store);
    const download = screen.getByRole('button', { name: downloadCSV$() });
    expect(download).toBeEnabled();
    const regenerate = screen.getByRole('button', { name: regenerateCSV$() });
    const exportControls = within(regenerate.parentElement);
    await userEvent.click(regenerate);
    expect(exportControls.getByRole('progressbar')).toBeInTheDocument();

    pollWithTasks({ ...queuedExport, status: TaskStatuses.FAILED });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(screen.getByTestId('user-export-status')).toHaveTextContent(csvExportFailed$());
    expect(exportControls.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(download).toBeEnabled();
    await userEvent.click(download);
    expectDownload(downloadLink, 'user', 'facility-1');
  });

  it('keeps the existing CSV downloadable when the server rejects a regeneration retry', async () => {
    fileInfo.mockResolvedValueOnce({ data: { user: existingUserDate } });
    await store.dispatch('manageCSV/getExportedCSVsInfo');
    await renderPage(store);
    const regenerate = screen.getByRole('button', { name: regenerateCSV$() });
    const notice = screen.getByTestId('user-export-status');
    await userEvent.click(regenerate);
    const previousError = 'The previous export failed';
    pollWithTasks({
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [previousError] },
    });
    await store.dispatch('manageCSV/refreshTaskList');
    expect(notice).toHaveTextContent(previousError);

    postTask.mockRejectedValueOnce({ response: { status: 400 } });
    await userEvent.click(regenerate);
    await waitFor(() => expect(notice).toHaveTextContent(csvExportFailed$()));
    expect(notice).not.toHaveTextContent(previousError);
    expect(regenerate).toBeEnabled();
    expect(regenerate).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: downloadCSV$() }));
    expectDownload(downloadLink, 'user', 'facility-1');
  });

  it('preserves the failure and allows retry when clearing the failed task is rejected', async () => {
    await renderPage(store);
    const generate = screen.getByRole('button', { name: generateCSV$() });
    const controls = within(generate.parentElement);
    await userEvent.click(generate);
    expect(controls.getByRole('progressbar')).toBeInTheDocument();

    const message = 'Could not find the facility';
    clearTask.mockRejectedValueOnce({ response: { status: 503 } });
    const failed = {
      ...queuedExport,
      status: TaskStatuses.FAILED,
      extra_metadata: { overall_error: [message] },
    };
    pollWithTasks(failed);
    await store.dispatch('manageCSV/refreshTaskList');
    expect(clearTask).toHaveBeenCalled();
    expect(screen.getByTestId('user-export-status')).toHaveTextContent(message);
    expect(controls.queryByRole('progressbar')).not.toBeInTheDocument();

    pollWithTasks(failed);
    await store.dispatch('manageCSV/refreshTaskList');
    expect(screen.getByTestId('user-export-status')).toHaveTextContent(message);
    expect(controls.queryByRole('progressbar')).not.toBeInTheDocument();
    postTask.mockResolvedValueOnce({ data: retryExport });
    await userEvent.click(generate);
    expect(postTask).toHaveBeenCalledTimes(2);
    expect(controls.getByRole('progressbar')).toBeInTheDocument();
  });

  it.each([true, false])(
    'can regenerate after a log refresh (file info first: %s)',
    async fileFirst => {
      fileInfo.mockResolvedValueOnce({ data: { user: existingUserDate } });
      await store.dispatch('manageCSV/getExportedCSVsInfo');
      await renderPage(store);
      const regenerate = screen.getByRole('button', { name: regenerateCSV$() });
      const exportControls = within(regenerate.parentElement);
      const notice = screen.getByTestId('user-export-status');
      expect(notice).toBeEmptyDOMElement();
      await userEvent.click(regenerate);
      expect(exportControls.getByRole('progressbar')).toBeInTheDocument();

      pollWithTasks(runningSummaryExport);
      await store.dispatch('manageCSV/refreshTaskList');
      let resolveLookup;
      fileInfo.mockReturnValueOnce(
        new Promise(resolve => {
          resolveLookup = resolve;
        }),
      );
      pollWithTasks(
        { ...runningSummaryExport, status: TaskStatuses.COMPLETED },
        { ...queuedExport, status: TaskStatuses.RUNNING },
      );
      await store.dispatch('manageCSV/refreshTaskList');
      expect(exportControls.getByRole('progressbar')).toBeInTheDocument();

      const resolveFileInfo = async () => {
        resolveLookup({ data: { user: '2024-10-27T03:33:21+00:00' } });
        await global.flushPromises();
      };
      if (fileFirst) {
        await resolveFileInfo();
        expect(exportControls.getByRole('progressbar')).toBeInTheDocument();
      }
      await store.dispatch('manageCSV/refreshTaskList');
      if (!fileFirst) {
        expect(exportControls.getByRole('progressbar')).toBeInTheDocument();
        await resolveFileInfo();
      }

      await waitFor(() =>
        expect(exportControls.queryByRole('progressbar')).not.toBeInTheDocument(),
      );
      expect(notice).toBeEmptyDOMElement();
      expect(screen.getByRole('button', { name: downloadCSV$() })).toBeEnabled();
      await userEvent.click(regenerate);
      expect(postTask).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: queuedExport.type }),
      );
      expect(exportControls.getByRole('progressbar')).toBeInTheDocument();
    },
  );
});
