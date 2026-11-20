import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import PrePostTestRenderer from '../index.vue';

const { submitTestAction$ } = coursesStrings;

const content = {
  id: 'unit-id',
  content_id: 'unit-content-id',
  title: 'Unit',
  options: {
    completion_criteria: {
      threshold: { pre_post_test: { version_a_item_ids: ['item-1', 'item-2'] } },
    },
  },
};

const masteryCriterion = { type: 'pre_post_test', version: 'A', test_type: 'pre' };

// ContentViewer is globally registered, so a stub is the only seam for its answer.
const ContentViewerStub = {
  name: 'ContentViewer',
  methods: {
    checkAnswer() {
      return null;
    },
  },
  template: '<div />',
};

function renderTest(props) {
  return render(PrePostTestRenderer, {
    props: { content, masteryCriterion, userId: 'learner-id', ...props },
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: { ContentViewer: ContentViewerStub },
  });
}

async function submitTest() {
  await fireEvent.click(screen.getByRole('button', { name: submitTestAction$() }));
  const dialog = screen.getByRole('dialog');
  await fireEvent.click(within(dialog).getByRole('button', { name: submitTestAction$() }));
}

describe('PrePostTestRenderer', () => {
  it('finishes the test once the submission is saved', async () => {
    const { emitted } = renderTest({ updateContentSession: jest.fn().mockResolvedValue() });

    await submitTest();

    await waitFor(() => expect(emitted().finished).toHaveLength(1));
    expect(emitted().saveRejected).toBeUndefined();
  });

  it('stops waiting and reports the refused save when the submission is refused', async () => {
    const { emitted } = renderTest({
      updateContentSession: jest.fn().mockRejectedValue({ response: { status: 403 } }),
    });

    await submitTest();

    await waitFor(() => expect(emitted().saveRejected).toHaveLength(1));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(emitted().finished).toBeUndefined();
  });
});
