import { shallowMount, mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';

import { ClassesPageNames } from '../../../constants';
import HomePage from '../index';
/* eslint-disable import/named */
import useChannels, { useChannelsMock } from '../../../composables/useChannels';
import useUser, { useUserMock } from '../../../composables/useUser';
import useDeviceSettings, { useDeviceSettingsMock } from '../../../composables/useDeviceSettings';
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../../composables/useLearnerResources';
/* eslint-enable import/named */

jest.mock('../../../composables/useChannels');
jest.mock('../../../composables/useUser');
jest.mock('../../../composables/useDeviceSettings');
jest.mock('../../../composables/useLearnerResources');

const localVue = createLocalVue();
localVue.use(VueRouter);

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
  });
}

function getClassesSection(wrapper) {
  return wrapper.find('[data-test="classes"]');
}

function getContinueLearningSection(wrapper) {
  return wrapper.find('[data-test="continueLearning"]');
}

function getRecentLessonsSection(wrapper) {
  return wrapper.find('[data-test="recentLessons"]');
}

function getRecentQuizzesSection(wrapper) {
  return wrapper.find('[data-test="recentQuizzes"]');
}

function getExploreChannelsSection(wrapper) {
  return wrapper.find('[data-test="exploreChannels"]');
}

describe(`HomePage`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // set back to default values defined in __mocks__
    useUser.mockImplementation(() => useUserMock());
    useDeviceSettings.mockImplementation(() => useDeviceSettingsMock());
    useLearnerResources.mockImplementation(() => useLearnerResourcesMock());
  });

  it(`smoke test`, () => {
    const wrapper = shallowMount(HomePage);
    expect(wrapper.exists()).toBe(true);
  });

  describe(`"Your classes" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getClassesSection(wrapper).exists()).toBe(false);
    });

    it(`the section is displayed for a signed in user`, () => {
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

  describe(`"Continue learning from classes/on your own" section`, () => {
    it(`the section is not displayed for a guest user`, () => {
      const wrapper = makeWrapper();
      expect(getContinueLearningSection(wrapper).exists()).toBe(false);
    });

    it(`the section is not displayed for a signed in user who has
      no resources or quizzes in progress`, () => {
      useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
      const wrapper = makeWrapper();
      expect(getContinueLearningSection(wrapper).exists()).toBe(false);
    });

    describe(`for a signed in user who has some classes resources or quizzes in progress`, () => {
      beforeEach(() => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableClassesQuizzes: [
              { id: 'class-quiz-1', title: 'Class quiz 1' },
              { id: 'class-quiz-2', title: 'Class quiz 2' },
            ],
            resumableClassesResources: [
              { contentNodeId: 'class-resource-1', lessonId: 'class-1-lesson', classId: 'class-1' },
              { contentNodeId: 'class-resource-2', lessonId: 'class-2-lesson', classId: 'class-2' },
            ],
            resumableNonClassesContentNodes: [
              { id: 'non-class-resource-1', title: 'Non-class resource 1' },
              { id: 'non-class-resource-2', title: 'Non-class resource 2' },
            ],
            getResumableContentNode(contentNodeId) {
              if (contentNodeId === 'class-resource-1') {
                return { id: 'class-resource-1', title: 'Class resource 1' };
              } else if (contentNodeId === 'class-resource-2') {
                return { id: 'class-resource-2', title: 'Class resource 2' };
              }
            },
            getClassQuizLink() {
              return { path: '/class-quiz' };
            },
            getClassResourceLink() {
              return { path: '/class-resource' };
            },
          })
        );
      });

      it(`"Continue learning on your own" section is not displayed`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.text()).not.toContain('Continue learning on your own');
      });

      it(`"Continue learning from your classes" section is displayed`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.text()).toContain('Continue learning from your classes');
      });

      it(`resources in progress outside of classes are not displayed`, () => {
        const wrapper = makeWrapper();
        expect(getContinueLearningSection(wrapper).text()).not.toContain('Non-class resource 1');
        expect(getContinueLearningSection(wrapper).text()).not.toContain('Non-class resource 2');
      });

      it(`classes resources and quizzes in progress are displayed`, () => {
        const wrapper = makeWrapper();
        const links = getContinueLearningSection(wrapper).findAll('a');
        expect(links.length).toBe(4);
        expect(links.at(0).text()).toBe('Class resource 1');
        expect(links.at(1).text()).toBe('Class resource 2');
        expect(links.at(2).text()).toBe('Class quiz 1');
        expect(links.at(3).text()).toBe('Class quiz 2');
      });

      it(`clicking a resource navigates to the class resource page`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.vm.$route.path).toBe('/');
        const links = getContinueLearningSection(wrapper).findAll('a');
        links.at(0).trigger('click');
        expect(wrapper.vm.$route.path).toBe('/class-resource');
      });

      it(`clicking a quiz navigates to the class quiz page`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.vm.$route.path).toBe('/');
        const links = getContinueLearningSection(wrapper).findAll('a');
        links.at(2).trigger('click');
        expect(wrapper.vm.$route.path).toBe('/class-quiz');
      });
    });

    describe(`for a signed in user who doesn't have any classes resources or quizzes in progress
      and has some resources in progress outside of classes`, () => {
      beforeEach(() => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableNonClassesContentNodes: [
              { id: 'non-class-resource-1', title: 'Non-class resource 1' },
              { id: 'non-class-resource-2', title: 'Non-class resource 2' },
            ],
            getTopicContentNodeLink() {
              return { path: '/topic-resource' };
            },
          })
        );
      });

      it(`"Continue learning from your classes" section is not displayed`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.text()).not.toContain('Continue learning from your classes');
      });

      it(`"Continue learning on your own" section is not displayed
        when access to unassigned content is not allowed`, () => {
        const wrapper = makeWrapper();
        expect(wrapper.text()).not.toContain('Continue learning on your own');
      });

      describe(`when access to unassigned content is allowed`, () => {
        beforeEach(() => {
          useDeviceSettings.mockImplementation(() =>
            useDeviceSettingsMock({
              canAccessUnassignedContent: true,
            })
          );
        });

        it(`"Continue learning on your own" section is displayed`, () => {
          const wrapper = makeWrapper();
          expect(wrapper.text()).toContain('Continue learning on your own');
        });

        it(`resources in progress outside of classes are displayed`, () => {
          const wrapper = makeWrapper();
          const links = getContinueLearningSection(wrapper).findAll('a');
          expect(links.length).toBe(2);
          expect(links.at(0).text()).toBe('Non-class resource 1');
          expect(links.at(1).text()).toBe('Non-class resource 2');
        });

        it(`clicking a resource navigates to the topic resource page`, () => {
          const wrapper = makeWrapper();
          expect(wrapper.vm.$route.path).toBe('/');
          const links = getContinueLearningSection(wrapper).findAll('a');
          links.at(0).trigger('click');
          expect(wrapper.vm.$route.path).toBe('/topic-resource');
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
        who has some resumable classes resources`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableClassesResources: [
              { contentNodeId: 'class-resource-1', lessonId: 'class-1-lesson', classId: 'class-1' },
              { contentNodeId: 'class-resource-2', lessonId: 'class-2-lesson', classId: 'class-2' },
            ],
            getClassResourceLink() {
              return { path: '/class-resource' };
            },
          })
        );

        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
      });

      it(`the section is not displayed for a signed in user
        who has some resumable quizzes`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableClassesQuizzes: [
              { id: 'class-quiz-1', title: 'Class quiz 1' },
              { id: 'class-quiz-2', title: 'Class quiz 2' },
            ],
            getClassQuizLink() {
              return { path: '/class-quiz' };
            },
          })
        );

        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
      });

      it(`the section is not displayed for a signed in user
        who has no resumable classes resources or quizzes
        when access to unassigned content is not allowed`, () => {
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
        const wrapper = makeWrapper();
        expect(getExploreChannelsSection(wrapper).exists()).toBe(false);
      });

      it(`the section is displayed for a signed in user
        who has no resumable classes resources or quizzes
        when access to unassigned content is allowed`, () => {
        useDeviceSettings.mockImplementation(() =>
          useDeviceSettingsMock({
            canAccessUnassignedContent: true,
          })
        );
        useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
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
