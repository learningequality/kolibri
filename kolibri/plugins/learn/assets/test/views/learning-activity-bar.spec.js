import { shallowMount, mount } from '@vue/test-utils';

import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
import LearningActivityBar from '../../src/views/LearningActivityBar';

function makeWrapper({ propsData } = {}) {
  return mount(LearningActivityBar, { propsData });
}

describe('LearningActivityBar', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(LearningActivityBar, {
      propsData: {
        learningActivities: [LearningActivities.WATCH],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows a resource title in the bar', () => {
    const wrapper = makeWrapper({
      propsData: {
        resourceTitle: 'Practice and applications of math',
        learningActivities: [LearningActivities.WATCH],
      },
    });
    expect(wrapper.text()).toContain('Practice and applications of math');
  });

  it('shows the back button in the bar', () => {
    const wrapper = makeWrapper({
      propsData: {
        learningActivities: [LearningActivities.WATCH],
      },
    });
    expect(wrapper.find('[data-test="backButton"]').exists()).toBeTruthy();
  });

  it('emits `navigateBack` event on the back button click', () => {
    const wrapper = makeWrapper({
      propsData: {
        learningActivities: [LearningActivities.WATCH],
      },
    });
    wrapper.find('[data-test="backButton"]').trigger('click');
    expect(wrapper.emitted().navigateBack.length).toBe(1);
  });

  it('shows a learning activity icon in the bar', () => {
    const wrapper = makeWrapper({
      propsData: {
        learningActivities: [LearningActivities.WATCH],
      },
    });
    expect(wrapper.find('[data-test="learningActivityIcon"]').exists()).toBeTruthy();
  });

  // Although there are basic tests for distribution
  // of action buttons between the bar and the menu in the following tests,
  // their position can further change based on the window size.
  // Purpose of these tests is rather functional. Testing all screen
  // sizes here would result in a huge test case and it needs to be
  // tested visually anyways. For that reason, the following tests always
  // assume a large screen.
  describe('on a large screen', () => {
    describe('in the lesson context', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            isLessonContext: true,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it("doesn't show 'View topic resources' button in the bar", () => {
        expect(wrapper.find("[data-test='bar_viewTopicResourcesButton']").exists()).toBeFalsy();
      });

      it("shows 'View lesson plan' button in the bar", () => {
        expect(wrapper.find("[data-test='bar_viewLessonPlanButton']").exists()).toBeTruthy();
      });

      it("emits `viewResourceList` event on the 'View lesson plan' button click", () => {
        wrapper.find('[data-test="bar_viewLessonPlanButton"]').trigger('click');
        expect(wrapper.emitted().viewResourceList.length).toBe(1);
      });
    });

    describe('in the non-lesson context', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            isLessonContext: false,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it("doesn't show 'View lesson plan' button in the bar", () => {
        expect(wrapper.find("[data-test='bar_viewLessonPlanButton']").exists()).toBeFalsy();
      });

      it("shows 'View topic resources' button in the bar", () => {
        expect(wrapper.find("[data-test='bar_viewTopicResourcesButton']").exists()).toBeTruthy();
      });

      it("emits `viewResourceList` event on the 'View topic resources' button click", () => {
        wrapper.find('[data-test="bar_viewTopicResourcesButton"]').trigger('click');
        expect(wrapper.emitted().viewResourceList.length).toBe(1);
      });
    });

    describe('when a resource is bookmarked', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            isBookmarked: true,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it("doesn't show the add bookmark button in the bar", () => {
        expect(wrapper.find("[data-test='bar_addBookmarkButton']").exists()).toBeFalsy();
      });

      it('shows the remove bookmark button in the bar', () => {
        expect(wrapper.find("[data-test='bar_removeBookmarkButton']").exists()).toBeTruthy();
      });

      it('emits `toogleBookmark` event on the remove bookmark button click', () => {
        wrapper.find("[data-test='bar_removeBookmarkButton']").trigger('click');
        expect(wrapper.emitted().toogleBookmark.length).toBe(1);
      });
    });

    describe('when a resource is not bookmarked', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            isBookmarked: false,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it("doesn't show the remove bookmark button in the bar", () => {
        expect(wrapper.find("[data-test='bar_removeBookmarkButton']").exists()).toBeFalsy();
      });

      it('shows the add bookmark button in the bar', () => {
        expect(wrapper.find("[data-test='bar_addBookmarkButton']").exists()).toBeTruthy();
      });

      it('emits `toogleBookmark` event on the add bookmark button click', () => {
        wrapper.find("[data-test='bar_addBookmarkButton']").trigger('click');
        expect(wrapper.emitted().toogleBookmark.length).toBe(1);
      });
    });

    describe('if a resource can be manually marked as complete', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            allowMarkComplete: true,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it('shows the more options button', () => {
        expect(wrapper.find("[data-test='moreOptionsButton']").exists()).toBeTruthy();
      });

      it("shows 'Mark resource as finished' button in the menu", () => {
        expect(wrapper.find("[data-test='bar_markCompleteButton']").exists()).toBeFalsy();
        expect(wrapper.find("[data-test='menu_markCompleteButton']").exists()).toBeTruthy();
      });

      it("emits `markComplete` event on the 'Mark resource as finished' button click", () => {
        wrapper.find("[data-test='menu_markCompleteButton']").vm.$emit('select');
        expect(wrapper.emitted().markComplete.length).toBe(1);
      });

      it("shows 'View information' button in the menu", () => {
        expect(wrapper.find("[data-test='bar_viewInfoButton']").exists()).toBeFalsy();
        expect(wrapper.find("[data-test='menu_viewInfoButton']").exists()).toBeTruthy();
      });

      it("emits `viewInfo` event on the 'View information' menu button click", () => {
        wrapper.find("[data-test='menu_viewInfoButton']").vm.$emit('select');
        expect(wrapper.emitted().viewInfo.length).toBe(1);
      });
    });

    describe("if a resource can't be manually marked as complete", () => {
      let wrapper;

      beforeEach(() => {
        wrapper = makeWrapper({
          propsData: {
            allowMarkComplete: false,
            learningActivities: [LearningActivities.WATCH],
          },
        });
      });

      it("doesn't show the more options button", () => {
        expect(wrapper.find("[data-test='moreOptionsButton']").exists()).toBeFalsy();
      });

      it("doesn't show 'Mark resource as finished' button", () => {
        expect(wrapper.find("[data-test='bar_markCompleteButton']").exists()).toBeFalsy();
        expect(wrapper.find("[data-test='menu_markCompleteButton']").exists()).toBeFalsy();
      });

      it("shows 'View information' button in the bar", () => {
        expect(wrapper.find("[data-test='menu_viewInfoButton']").exists()).toBeFalsy();
        expect(wrapper.find("[data-test='bar_viewInfoButton']").exists()).toBeTruthy();
      });

      it("emits `viewInfo` event on the 'View information' bar button click", () => {
        wrapper.find("[data-test='bar_viewInfoButton']").trigger('click');
        expect(wrapper.emitted().viewInfo.length).toBe(1);
      });
    });
  });
});
