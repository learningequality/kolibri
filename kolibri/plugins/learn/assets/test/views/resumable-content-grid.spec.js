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
         * moreResumableContentNodes having length would realistically mean
         * that there are a significant number of resumableContentNodes but we
         * rely on useSearch to handle the details of that implementation
         */
        resumableContentNodes: [{ node: 1 }],
        moreResumableContentNodes: [{ node: 2 }],
      })
    )
  );
  afterEach(() => jest.clearAllMocks());
  it('displays resumable content nodes string', () => {
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="recent-content-nodes-title"').element).toBeTruthy();
  });

  it('displays grid / list toggle buttons when on medium or larger screens', () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      computed: { windowIsMedium: () => true },
    });
    expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeTruthy();
  });

  it('does not show the grid / list toggle buttons when on extra small screens', async () => {
    const wrapper = shallowMount(ResumableContentGrid, {
      computed: { windowIsSmall: () => true },
    });
    expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeFalsy();
  });

  it('displays ResumableContentGrid', () => {
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="resumable-content-card-grid"').element).toBeTruthy();
  });

  it('displays button to show more resumableContentNodes when there are moreResumableContentNodes', () => {
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="more-resumable-nodes-button"').element).toBeTruthy();
  });

  it('does not show a button to show more resumableContentNodes when there are no moreResumableContentNodes', () => {
    jest.clearAllMocks();
    useLearnerResources.mockImplementation(() =>
      useLearnerResourcesMock({
        resumableContentNodes: [{ node: 1 }],
        moreResumableContentNodes: [],
      })
    );
    const wrapper = shallowMount(ResumableContentGrid, {});
    expect(wrapper.find('[data-test="more-resumable-nodes-button"').element).toBeFalsy();
  });
});
