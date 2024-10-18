import { createLocalVue, shallowMount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import KRouterLink from 'kolibri-design-system/lib/buttons-and-links/KRouterLink';
import LearnerNeeds from 'kolibri-constants/labels/Needs';
import AccessibilityCategories from 'kolibri-constants/labels/AccessibilityCategories';
import GradeLevels from 'kolibri-constants/labels/Levels';
import ResourceTypes from 'kolibri-constants/labels/ResourceType';
import Subjects from 'kolibri-constants/labels/Subjects';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import ContentNodeThumbnail from '../../src/views/thumbnails/ContentNodeThumbnail';
import BrowseResourceMetadata from '../../src/views/BrowseResourceMetadata';
import routes from '../../src/routes/index.js';

const localVue = createLocalVue();
localVue.use(VueRouter);

jest.mock('../../src/composables/useContentLink');
jest.mock('kolibri-plugin-data', () => {
  return {
    __esModule: true,
    default: {
      accessibilityLabels: [],
      gradeLevels: [],
      learnerNeeds: [],
    },
  };
});

const promise = new Promise(() => []);

ContentNodeResource.fetchRecommendationsFor = jest.fn(() => promise);
ContentNodeResource.fetchCollection = jest.fn(() => promise);

const baseContentNode = {
  id: '2ea9bda8703241be89b5b9fd87f88815',
  author: 'Test Author',
  channel_id: '95a52b386f2c485cb97dd60901674a98',
  content_id: '682e09992e9c5f2baea4b8bee92c6c0c',
  description: 'Learn what it means to add. The examples used are 1+1 and 2+3.\n\n',
  kind: 'video',
  license_description: 'Licensed Content',
  license_name: 'CC BY-NC-SA',
  license_owner: 'Khan Academy',
  parent: '55b3dffe512c4d93bcdc85efde1046f5',
  title: 'Intro to addition',
  learning_activities: [LearningActivities.READ],
  // Include FOR_BEGINNERS which shows the related Chip, then another because
  // FOR_BEGINNERS is handled specially, so we need another to test that we show
  // the "learner needs" section
  learner_needs: [LearnerNeeds.FOR_BEGINNERS, LearnerNeeds.PAPER_PENCIL],
  grade_levels: [GradeLevels.WORK_SKILLS, GradeLevels.UPPER_PRIMARY],
  resource_types: [ResourceTypes.TUTORIAL],
  accessibility_labels: [AccessibilityCategories.CAPTIONS_SUBTITLES],
  categories: [Subjects.NUMERACY],
  duration: 3600,
  lang: {
    id: 'en',
    lang_code: 'en',
    lang_subcode: null,
    lang_name: 'English',
    lang_direction: 'ltr',
  },
  is_leaf: true,
  ancestors: [
    {
      id: '95a52b386f2c485cb97dd60901674a98',
      title: 'Kolibri QA Channel',
    },
    {
      id: '55b3dffe512c4d93bcdc85efde1046f5',
      title: 'Videos',
    },
  ],
};

function makeContentNode(metadata = {}) {
  return { ...baseContentNode, ...metadata };
}

function makeWrapper(metadata = {}, options = {}, canDownloadExternally = false) {
  const content = makeContentNode(metadata);
  const propsData = { content, canDownloadExternally };
  return shallowMount(BrowseResourceMetadata, {
    localVue,
    propsData,
    router: new VueRouter(routes),
    ...options,
  });
}

describe('BrowseResourceMetadata', () => {
  /* The base makeWrapper bootstraps a content item that has all of the metadata
   * for a fully loaded component in place.
   *
   * Passing { `metadata_key` : [] } to makeWrapper's metadata arg will override the
   * data to be empty in order to test that nothing shows as expected
   */
  let wrapper;

  describe('metadata is displayed when present on given content', () => {
    beforeAll(() => (wrapper = makeWrapper()));

    it('shows the forBeginners chip when one of LearnerNeeds is FOR_BEGINNERS', () => {
      expect(wrapper.find("[data-test='beginners-chip']").exists()).toBeTruthy();
    });

    it('shows the view resource button-link', () => {
      const link = wrapper.findComponent(KRouterLink);
      expect(link.exists()).toBeTruthy();
    });

    it('displays a ContentNodeThumbnail', () => {
      expect(wrapper.findComponent(ContentNodeThumbnail).exists()).toBeTruthy();
    });

    it('shows the title', () => {
      expect(wrapper.find("[data-test='content-title']").text()).toEqual(baseContentNode.title);
    });

    it('shows the estimated time when duration is present', () => {
      expect(wrapper.find("[data-test='estimated-time']").exists()).toBeTruthy();
    });

    it('it shows the grade levels when there are some', () => {
      expect(wrapper.find("[data-test='grade-levels']").exists()).toBeTruthy();
    });

    it("shows author's name", () => {
      expect(wrapper.find("[data-test='author']").exists()).toBeTruthy();
    });

    it('shows license owner', () => {
      expect(wrapper.find("[data-test='license-owner']").exists()).toBeTruthy();
    });

    it('shows license description', () => {
      expect(wrapper.find("[data-test='license-desc']").exists()).toBeTruthy();
    });
  });

  describe('metadata sections are not visible without data', () => {
    // With the metadata wiped
    beforeAll(
      () =>
        (wrapper = makeWrapper({
          learner_needs: [],
          learning_activities: [],
          grade_levels: [],
          accessibility_labels: [],
          thumbnail: null, // Should still render the component though
          resource_types: [],
          categories: [],
          duration: null,
          lang: null,
          title: null,
          description: null,
          author: null,
          license_description: null,
          license_name: null,
          license_owner: null,
        })),
    );

    it('does not show the forBeginners chip when one of LearnerNeeds is FOR_BEGINNERS', () => {
      expect(wrapper.find("[data-test='beginners-chip']").exists()).toBeFalsy();
    });

    it('displays a ContentNodeThumbnail - which handles showing the placeholder', () => {
      expect(wrapper.findComponent(ContentNodeThumbnail).exists()).toBeTruthy();
    });

    it('does not show the title', () => {
      expect(wrapper.find("[data-test='content-title']").exists()).toBeFalsy();
    });

    it('does not show the estimated time when duration is not present', () => {
      expect(wrapper.find("[data-test='estimated-time']").exists()).toBeFalsy();
    });

    it('it does not show the grade levels when there are none', () => {
      expect(wrapper.find("[data-test='grade-levels']").exists()).toBeFalsy();
    });

    it("does not show author's name section without the data", () => {
      expect(wrapper.find("[data-test='author']").exists()).toBeFalsy();
    });

    it('does not show license owner section without the data', () => {
      expect(wrapper.find("[data-test='license-owner']").exists()).toBeFalsy();
    });

    it('does not show license description section without the data', () => {
      expect(wrapper.find("[data-test='license-desc']").exists()).toBeFalsy();
    });
  });
  describe('download button gets toggled by prop', () => {
    it('should display the button when canDownloadExternally is true', () => {
      const wrapper = makeWrapper({}, {}, true);
      expect(wrapper.find("[data-test='download']").exists()).toBeTruthy();
    });
    it('should not display the button when canDownloadExternally is false', () => {
      const wrapper = makeWrapper({}, {}, false);
      expect(wrapper.find("[data-test='download']").exists()).toBeFalsy();
    });
  });
});
