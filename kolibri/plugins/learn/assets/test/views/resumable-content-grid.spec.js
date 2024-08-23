import { shallowMount } from '@vue/test-utils';
/* eslint-disable import/named */
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../src/composables/useLearnerResources';
/* eslint-enable import/named */
import ResumableContentGrid from '../../src/views/LibraryPage/ResumableContentGrid';

jest.mock('../../src/composables/useLearnerResources');

describe('when there are nodes with progress that can be resumed', () => {
  beforeEach(() =>
    useLearnerResources.mockImplementation(() =>
      useLearnerResourcesMock({
        /*
         * moreResumableContentNodes existing would realistically mean
         * that there are 13+ resumableContentNodes but we
         * rely on useBaseSearch to handle the details of that implementation
         */
        resumableContentNodes: [
          { node: 1 },
          { node: 2 },
          { node: 3 },
          { node: 4 },
          { node: 5 },
          { node: 6 },
          { node: 7 },
          { node: 8 },
          { node: 9 },
          { node: 10 },
          { node: 11 },
          { node: 12 },
        ],
        moreResumableContentNodes: { cursor: 'rogkor2', resume: true },
      }),
    ),
  );
  afterEach(() => jest.clearAllMocks());
  it('displays resumable content nodes string', () => {
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="recent-content-nodes-title"').element).toBeTruthy();
  });

  it('displays grid / list toggle buttons when on medium or larger screens', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: () => ({ windowIsSmall: false }),
    });
    expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeTruthy();
  });

  it('does not show the grid / list toggle buttons when on extra small screens', async () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: () => ({ windowIsSmall: true }),
    });
    expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeFalsy();
  });

  it('displays ResumableContentGrid', () => {
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="resumable-content-card-grid"').element).toBeTruthy();
  });

  it('displays button to "show more" when more items exist than currently shown', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: function () {
        return { showMoreContentCards: false };
      },
      computed: { moreContentCards: () => true },
    });
    expect(wrapper.find('[data-test="show-more-resumable-nodes-button"').element).toBeTruthy();
  });

  it('does not show a button to "show more" if button already pressed', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: function () {
        return { showMoreContentCards: true };
      },
      computed: { moreContentCards: () => false },
    });
    expect(wrapper.find('[data-test="show-more-resumable-nodes-button"').element).toBeFalsy();
  });

  it('does not show a button to "show more" if number of items does not exceed that displayed', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: function () {
        return { showMoreContentCards: true };
      },
      computed: { moreContentCards: () => false },
    });
    expect(wrapper.find('[data-test="show-more-resumable-nodes-button"').element).toBeFalsy();
  });

  it('displays button to view more resumableContentNodes when there are 13+ recent items & 12 are currently displayed', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: function () {
        return { showMoreContentCards: true };
      },
      computed: { moreContentCards: () => true },
    });
    expect(wrapper.find('[data-test="view-more-resumable-nodes-button"').element).toBeTruthy();
  });

  it('does not show a button to view more resumableContentNodes if "show more" has not been exhausted', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      data: function () {
        return { showMoreContentCards: false };
      },
      computed: { moreContentCards: () => true },
    });
    expect(wrapper.find('[data-test="view-more-resumable-nodes-button"').element).toBeFalsy();
  });
});
