/* global flushPromises */
import { ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import LessonResource from 'kolibri-common/apiResources/LessonResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import * as lessonSummaryActions from '../../../../../../modules/lessonSummary/actions';
import useResourceSelection from '../../../../../../composables/useResourceSelection';
import { PageNames } from '../../../../../../constants';
import LessonResourceSelection from '../index.vue';

jest.mock('kolibri-common/apiResources/LessonResource');
jest.mock('kolibri/composables/useSnackbar', () => ({
  __esModule: true,
  default: () => ({ createSnackbar: jest.fn() }),
}));
jest.mock('../../../../../../composables/useResourceSelection');

const { saveAndFinishAction$ } = coreStrings;

const LESSON_ID = 'lesson-1';
const NEW_RESOURCE = {
  id: 'node-2',
  content_id: 'content-2',
  channel_id: 'channel-1',
  files: [{ file_size: 500 }],
};

function makeStore() {
  return {
    modules: {
      lessonSummary: {
        namespaced: true,
        state: {
          currentLesson: { id: LESSON_ID, title: 'Lesson', size: 100 },
          workingResources: [
            { contentnode_id: 'node-1', content_id: 'content-1', channel_id: 'channel-1' },
          ],
          resourceCache: {},
        },
        getters: {
          getChannelForNode: () => () => ({ title: 'Channel' }),
        },
        mutations: {
          SET_CURRENT_LESSON(state, lesson) {
            state.currentLesson = lesson;
          },
          SET_WORKING_RESOURCES(state, resources) {
            state.workingResources = [...resources];
          },
          ADD_TO_RESOURCE_CACHE() {},
        },
        actions: lessonSummaryActions,
      },
      classSummary: {
        namespaced: true,
        actions: { refreshClassSummary: jest.fn(() => Promise.resolve()) },
      },
    },
  };
}

describe('LessonResourceSelection', () => {
  beforeEach(() => {
    useResourceSelection.mockReturnValue({
      loading: ref(false),
      topic: ref(null),
      treeFetch: {},
      searchFetch: {},
      channelsFetch: {},
      bookmarksFetch: {},
      searchTerms: ref({}),
      selectionRules: [],
      selectedResources: ref([NEW_RESOURCE]),
      displayingSearchResults: ref(false),
      clearSearch: jest.fn(),
      selectResources: jest.fn(),
      deselectResources: jest.fn(),
      setSelectedResources: jest.fn(),
      removeSearchFilterTag: jest.fn(),
    });
    LessonResource.update.mockResolvedValue({ id: LESSON_ID });
    LessonResource.retrieve.mockResolvedValue({ id: LESSON_ID, title: 'Lesson' });
    LessonResource.fetchLessonsSizes.mockResolvedValue([{ [LESSON_ID]: 600 }]);
  });

  it('updates the lesson size after adding resources', async () => {
    let store;
    render(
      LessonResourceSelection,
      {
        store: makeStore(),
        routes: [
          { path: '/', name: PageNames.LESSON_SELECT_RESOURCES_INDEX },
          { path: '/preview', name: PageNames.LESSON_SELECT_RESOURCES_PREVIEW_SELECTION },
          { path: '/summary', name: PageNames.LESSON_SUMMARY },
        ],
      },
      (vue, vuexStore) => {
        store = vuexStore;
      },
    );
    await flushPromises();

    await fireEvent.click(screen.getByRole('button', { name: saveAndFinishAction$() }));
    await flushPromises();

    expect(store.state.lessonSummary.currentLesson.size).toBe(600);
  });
});
