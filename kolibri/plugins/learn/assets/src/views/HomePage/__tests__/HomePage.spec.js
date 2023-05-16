import { shallowMount, mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

import { useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
import useUser, { useUserMock } from 'kolibri.coreVue.composables.useUser';
import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
import { ClassesPageNames } from '../../../constants';
import HomePage from '../index';
/* eslint-disable import/named */
import useChannels, { useChannelsMock } from '../../../composables/useChannels';
import useDeviceSettings, { useDeviceSettingsMock } from '../../../composables/useDeviceSettings';
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../../composables/useLearnerResources';
/* eslint-enable import/named */
jest.mock('kolibri.coreVue.componentSets.sync');
jest.mock('../../../composables/useChannels');
jest.mock('kolibri.coreVue.composables.useUser');
jest.mock('../../../composables/useDeviceSettings');
jest.mock('../../../composables/useLearnerResources');
jest.mock('../../../composables/useContentLink');
// Needed to test anything using mount() where children use this composable
jest.mock('../../../composables/useLearningActivities');
jest.mock('kolibri-design-system/lib/useKResponsiveWindow');

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);
const mockStore = new Vuex.Store({
  state: { core: { loading: false } },
  getters: {
    isUserLoggedIn: jest.fn(),
    isAppContext: jest.fn(),
    isLearner: jest.fn(),
  },
});

function makeWrapper() {
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
    ],
  });
  router.push('/');

  return mount(HomePage, {
    localVue,
    router,
    stubs: ['SideNav', 'LearnTopNav'],
    store: mockStore,
  });
}

function getClassesSection(wrapper) {
  return wrapper.find('[data-test="classes"]');
}

function getContinueLearningFromClassesSection(wrapper) {
  return wrapper.find('[data-test="continueLearningFromClasses"]');
}

function getRecentLessonsSection(wrapper) {
  return wrapper.find('[data-test="recentLessons"]');
}

function getRecentQuizzesSection(wrapper) {
  return wrapper.find('[data-test="recentQuizzes"]');
}

function getContinueLearningOnYourOwnSection(wrapper) {
  return wrapper.find('[data-test="continueLearningOnYourOwn"]');
}

function getExploreChannelsSection(wrapper) {
  return wrapper.find('[data-test="exploreChannels"]');
}

describe(`HomePage`, () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // set back to default values defined in __mocks__
    useUser.mockImplementation(() => useUserMock());
    useDeviceSettings.mockImplementation(() => useDeviceSettingsMock());
    useLearnerResources.mockImplementation(() => useLearnerResourcesMock());
    useDevicesWithFacility.mockReturnValue({
      devices: [
        {
          id: '1',
          available: true,
        },
      ],
    });
  });

  it(`smoke test`, () => {
    const wrapper = shallowMount(HomePage, {
      store: mockStore,
    });
    expect(wrapper.exists()).toBe(true);
  });

  describe(`"Your classes" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user who has no classes and can access unassigned content`, () => {
      useDeviceSettings.mockImplementation(() =>
        useDeviceSettingsMock({ canAccessUnassignedContent: true })
      );
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is displayed for a signed in user with no classes who cannot access unassigned content`, () => {
      useDeviceSettings.mockImplementation(() =>
        useDeviceSettingsMock({ canAccessUnassignedContent: false })
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
        })
      );
      const wrapper = makeWrapper();
      const links = getClassesSection(wrapper).findAll('[data-test="classLink"]');
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
          })
        );
      });

      it(`the section is displayed and contains classes resources and quizzes in progress`, () => {
        const wrapper = makeWrapper();
        const links = getContinueLearningFromClassesSection(wrapper).findAll('a');
        expect(links.length).toBe(4);
        expect(links.at(0).text()).toBe('Class resource 1');
        expect(links.at(1).text()).toBe('Class resource 2');
        expect(links.at(2).text()).toBe('Class quiz 1');
        expect(links.at(3).text()).toBe('Class quiz 2');
      });

      it(`non-classes resources in progress  are not displayed`, () => {
        const wrapper = makeWrapper();
        expect(getContinueLearningFromClassesSection(wrapper).text()).not.toContain(
          'Non-class resource 1'
        );
        expect(getContinueLearningFromClassesSection(wrapper).text()).not.toContain(
          'Non-class resource 2'
        );
      });

      it(`clicking a quiz navigates to the class quiz page`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.vm.$route.path).toBe('/');
        const links = getContinueLearningFromClassesSection(wrapper).findAll('a');
        links.at(2).trigger('click');
        expect(wrapper.vm.$route.path).toBe('/class-quiz');
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
          activeClassesLessons: [
            { id: 'lesson-1', title: 'Lesson 1', is_active: true },
            { id: 'lesson-2', title: 'Lesson 2', is_active: true },
          ],
          getClassLessonLink() {
            return { path: '/class-lesson' };
          },
        })
      );
      const wrapper = makeWrapper();
      expect(getRecentLessonsSection(wrapper).exists()).toBe(true);
      const links = getRecentLessonsSection(wrapper).findAll('a');
      expect(links.length).toBe(2);
      expect(links.at(0).text()).toBe('Lesson 1');
      expect(links.at(1).text()).toBe('Lesson 2');
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
          activeClassesQuizzes: [
            { id: 'quiz-1', title: 'Quiz 1', active: true },
            { id: 'quiz-2', title: 'Quiz 2', active: true },
          ],
          getClassQuizLink() {
            return { path: '/class-quiz' };
          },
        })
      );
      const wrapper = makeWrapper();
      expect(getRecentQuizzesSection(wrapper).exists()).toBe(true);
      const links = getRecentQuizzesSection(wrapper).findAll('a');
      expect(links.length).toBe(2);
      expect(links.at(0).text()).toBe('Quiz 1');
      expect(links.at(1).text()).toBe('Quiz 2');
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
          })
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
            })
          );
        });

        it(`the section is displayed and contains non-classes resources in progress`, () => {
          const wrapper = makeWrapper();
          expect(getContinueLearningOnYourOwnSection(wrapper).exists()).toBe(true);
          const links = getContinueLearningOnYourOwnSection(wrapper).findAll('a');
          expect(links.length).toBe(2);
          expect(links.at(0).text()).toBe('Non-class resource 1');
          expect(links.at(1).text()).toBe('Non-class resource 2');
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
        useChannels.mockImplementation(() => useChannelsMock({ channels: [{ id: 'channel-1' }] }));
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
          })
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
          })
        );
        useDeviceSettings.mockImplementation(() =>
          useDeviceSettingsMock({
            canAccessUnassignedContent: true,
          })
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
