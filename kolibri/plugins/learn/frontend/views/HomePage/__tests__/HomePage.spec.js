import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';

import { useDevicesWithFilter } from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useTotalProgress, { useTotalProgressMock } from 'kolibri/composables/useTotalProgress'; // eslint-disable-line
import { ref } from 'vue';
// eslint-disable-next-line import-x/named
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
import { ClassesPageNames, PageNames } from '../../../constants';
import HomePage from '../index';
/* eslint-disable import-x/named */
import useDeviceSettings, { useDeviceSettingsMock } from '../../../composables/useDeviceSettings';
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../../composables/useLearnerResources';
/* eslint-enable import-x/named */
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/appError');
jest.mock('kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../composables/useDeviceSettings');
jest.mock('../../../composables/useLearnerResources');
jest.mock('../../../composables/useContentLink');
jest.mock('kolibri-common/composables/usePageLoading');
// Needed to test anything using mount() where children use this composable
jest.mock('kolibri-common/composables/useLearningActivities');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useTotalProgress');

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

function makeWrapper() {
  const mockStore = new Store({
    state: { core: {}, welcomeModalVisible: false },
    getters: {},
    mutations: {
      SET_WELCOME_MODAL_VISIBLE: jest.fn(),
      SET_PAGE_NAME: jest.fn(),
    },
    actions: {},
  });

  const router = new VueRouter({
    routes: [
      {
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        path: '/class',
      },
      {
        name: ClassesPageNames.ALL_CLASSES,
        path: '/classes',
      },
      {
        name: PageNames.LIBRARY,
        path: '/library',
      },
      {
        name: PageNames.TOPICS_TOPIC,
        path: '/topics/',
      },
    ],
  });

  router.push = jest.fn();

  return mount(HomePage, {
    localVue,
    router,
    stubs: ['SideNav'],
    store: mockStore,
  });
}

function getClassesSection(wrapper) {
  return wrapper.find('[data-testid="classes"]');
}

function getContinueLearningFromClassesSection(wrapper) {
  return wrapper.find('[data-testid="continueLearningFromClasses"]');
}

function getRecentLessonsSection(wrapper) {
  return wrapper.find('[data-testid="recentLessons"]');
}

function getRecentQuizzesSection(wrapper) {
  return wrapper.find('[data-testid="recentQuizzes"]');
}

function getContinueLearningOnYourOwnSection(wrapper) {
  return wrapper.find('[data-testid="continueLearningOnYourOwn"]');
}

function getExploreChannelsSection(wrapper) {
  return wrapper.find('[data-testid="exploreChannels"]');
}

describe(`HomePage`, () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });

  let totalProgressMock;
  beforeEach(() => {
    jest.clearAllMocks();
    // set back to default values defined in __mocks__
    useUser.mockImplementation(() => useUserMock());
    useDeviceSettings.mockImplementation(() => useDeviceSettingsMock());
    useLearnerResources.mockImplementation(() => useLearnerResourcesMock());
    useDevicesWithFilter.mockReturnValue({
      devices: [
        {
          id: '1',
          available: true,
        },
      ],
    });
    useChannels.mockImplementation(() =>
      useChannelsMock({
        fetchChannels: jest.fn(() => Promise.resolve([{ id: 'channel-1', name: 'Channel 1' }])),
      }),
    );
    totalProgressMock = { totalProgress: ref(null) };
    useTotalProgress.mockImplementation(() => useTotalProgressMock(totalProgressMock));
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  describe(`"Your classes" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user who has no classes and can access unassigned content`, () => {
      useDeviceSettings.mockImplementation(() =>
        useDeviceSettingsMock({ canAccessUnassignedContent: true }),
      );
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is displayed for a signed in user with no classes who cannot access unassigned content`, () => {
      useDeviceSettings.mockImplementation(() =>
        useDeviceSettingsMock({ canAccessUnassignedContent: false }),
      );
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(true);
    });

    it(`classes are displayed for a signed in user who is enrolled in some classes`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      useLearnerResources.mockImplementation(() =>
        useLearnerResourcesMock({
          classes: [
            { id: 'class-1', name: 'Class 1' },
            { id: 'class-2', name: 'Class 2' },
          ],
        }),
      );
      const wrapper = makeWrapper();
      const links = getClassesSection(wrapper).findAll('[data-testid="classLink"]');
      expect(links.length).toBe(2);
      expect(links.at(0).text()).toBe('Class 1');
      expect(links.at(1).text()).toBe('Class 2');
    });
  });

  describe(`"Continue learning from classes" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getContinueLearningFromClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user who has
      no classes resources or quizzes in progress`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getContinueLearningFromClassesSection(wrapper).exists()).toBe(false);
    });

    describe(`for a signed in user who has some resources or quizzes in progress`, () => {
      beforeEach(() => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableClassesQuizzes: [
              { id: 'class-quiz-1', title: 'Class quiz 1' },
              { id: 'class-quiz-2', title: 'Class quiz 2' },
            ],
            resumableClassesResources: [
              {
                contentNodeId: 'class-resource-1',
                lessonId: 'class-1-lesson',
                classId: 'class-1',
                progress: 0.5,
                contentNode: { id: 'class-resource-1', title: 'Class resource 1', is_leaf: true },
              },
              {
                contentNodeId: 'class-resource-2',
                lessonId: 'class-2-lesson',
                classId: 'class-2',
                progress: 0.5,
                contentNode: { id: 'class-resource-2', title: 'Class resource 2', is_leaf: true },
              },
            ],
            getClassQuizLink() {
              return { path: '/class-quiz' };
            },
          }),
        );
      });

      it(`the section is displayed and contains classes resources and quizzes in progress`, () => {
        const wrapper = makeWrapper();
        const continueLearningSection = getContinueLearningFromClassesSection(wrapper);
        expect(continueLearningSection.exists()).toBe(true);
        // Check the ContinueLearning component receives the correct data via the composable
        const continueLearningComponent = wrapper.findComponent({ name: 'ContinueLearning' });
        expect(continueLearningComponent.exists()).toBe(true);
        expect(continueLearningComponent.props('fromClasses')).toBe(true);
      });

      it(`non-classes resources in progress  are not displayed`, () => {
        const wrapper = makeWrapper();
        expect(getContinueLearningFromClassesSection(wrapper).text()).not.toContain(
          'Non-class resource 1',
        );
        expect(getContinueLearningFromClassesSection(wrapper).text()).not.toContain(
          'Non-class resource 2',
        );
      });

      it(`quiz links are generated correctly`, () => {
        const wrapper = makeWrapper();
        const continueLearningComponent = wrapper.findComponent({ name: 'ContinueLearning' });
        expect(continueLearningComponent.exists()).toBe(true);
        // Verify the getClassQuizLink function returns the expected link format
        expect(continueLearningComponent.vm.getClassQuizLink({ id: 'test' })).toEqual({
          path: '/class-quiz',
        });
      });
    });
  });

  describe(`"Recent lessons" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getRecentLessonsSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user
      who has no active lessons`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getRecentLessonsSection(wrapper).exists()).toBe(false);
    });

    it(`active lessons are displayed for a signed in user who has some`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      useLearnerResources.mockImplementation(() =>
        useLearnerResourcesMock({
          activeClassesLessons: ref([
            { id: 'lesson-1', title: 'Lesson 1', active: true },
            { id: 'lesson-2', title: 'Lesson 2', active: true },
          ]),
          getClassLessonLink() {
            return { path: '/class-lesson' };
          },
        }),
      );
      const wrapper = makeWrapper();
      expect(getRecentLessonsSection(wrapper).exists()).toBe(true);
      // Check that the AssignedLessonsCards component receives the correct lessons
      const lessonsCardsComponent = wrapper.findComponent({ name: 'AssignedLessonsCards' });
      expect(lessonsCardsComponent.exists()).toBe(true);
      expect(lessonsCardsComponent.props('lessons')).toHaveLength(2);
      expect(lessonsCardsComponent.props('lessons')[0].title).toBe('Lesson 1');
      expect(lessonsCardsComponent.props('lessons')[1].title).toBe('Lesson 2');
    });
  });

  describe(`"Recent quizzes" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getRecentQuizzesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user
      who has no active quizzes`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getRecentQuizzesSection(wrapper).exists()).toBe(false);
    });

    it(`active quizzes are displayed for a signed in user who has some`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      useLearnerResources.mockImplementation(() =>
        useLearnerResourcesMock({
          activeClassesQuizzes: ref([
            { id: 'quiz-1', title: 'Quiz 1', active: true },
            { id: 'quiz-2', title: 'Quiz 2', active: true },
          ]),
          getClassQuizLink() {
            return { path: '/class-quiz' };
          },
        }),
      );
      const wrapper = makeWrapper();
      expect(getRecentQuizzesSection(wrapper).exists()).toBe(true);
      // Check that the AssignedQuizzesCards component receives the correct quizzes
      const quizzesCardsComponent = wrapper.findComponent({ name: 'AssignedQuizzesCards' });
      expect(quizzesCardsComponent.exists()).toBe(true);
      expect(quizzesCardsComponent.props('quizzes')).toHaveLength(2);
      expect(quizzesCardsComponent.props('quizzes')[0].title).toBe('Quiz 1');
      expect(quizzesCardsComponent.props('quizzes')[1].title).toBe('Quiz 2');
    });
  });

  describe(`"Continue learning on your own" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getContinueLearningOnYourOwnSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user
      who hasn't finished all their classes resources and quizzes yet`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getContinueLearningOnYourOwnSection(wrapper).exists()).toBe(false);
    });

    describe(`for a signed in user
      who has finished all their classes resources and quizzes
      and has some non-classes resources in progress`, () => {
      beforeEach(() => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            learnerFinishedAllClasses: true,
            resumableContentNodes: [
              { id: 'non-class-resource-1', title: 'Non-class resource 1', is_leaf: true },
              { id: 'non-class-resource-2', title: 'Non-class resource 2', is_leaf: true },
            ],
          }),
        );
      });

      it(`the section is not displayed when access to unassigned content is not allowed`, () => {
        const wrapper = makeWrapper();
        expect(getContinueLearningOnYourOwnSection(wrapper).exists()).toBe(false);
      });

      describe(`when access to unassigned content is allowed`, () => {
        beforeEach(() => {
          useDeviceSettings.mockImplementation(() =>
            useDeviceSettingsMock({
              canAccessUnassignedContent: true,
            }),
          );
        });

        it(`the section is displayed and contains non-classes resources in progress`, () => {
          const wrapper = makeWrapper();
          expect(getContinueLearningOnYourOwnSection(wrapper).exists()).toBe(true);
          // Check the ContinueLearning component is rendered for self-directed learning
          const continueLearningComponent = wrapper.findComponent({ name: 'ContinueLearning' });
          expect(continueLearningComponent.exists()).toBe(true);
          expect(continueLearningComponent.props('fromClasses')).toBe(false);
        });
      });
    });
  });

  describe(`"Explore channels" section`, () => {
    it(`the section is not displayed when there are no channels available`, () => {
      const wrapper = makeWrapper();
      expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
    });

    describe(`when there are some channels available`, () => {
      beforeEach(() => {
        const channels = [{ id: 'channel-1' }];
        useChannels.mockImplementation(() =>
          useChannelsMock({
            localChannelsCache: channels,
            fetchChannels: jest.fn(() => Promise.resolve(channels)),
          }),
        );
      });

      it(`the section is not displayed for a signed in user
        who hasn't finished all their classes resources and quizzes yet`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
      });

      it(`the section is not displayed for a signed in user
        who has finished all their classes resources and quizzes
        when access to unassigned content is not allowed`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            learnerFinishedAllClasses: true,
          }),
        );
        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
      });

      it(`the section is displayed for a signed in user
        who has finished all their classes resources and quizzes
        when access to unassigned content is allowed`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            learnerFinishedAllClasses: true,
          }),
        );
        useDeviceSettings.mockImplementation(() =>
          useDeviceSettingsMock({
            canAccessUnassignedContent: true,
          }),
        );
        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(true);
      });

      it(`the section is displayed for a guest user`, () => {
        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(true);
      });
    });
  });
});
