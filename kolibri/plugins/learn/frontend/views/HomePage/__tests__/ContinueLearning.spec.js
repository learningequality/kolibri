import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import { PageNames } from '../../../constants';
import { setResumableContentNodes } from '../../../composables/useLearnerResources';
import CopiesModal from '../../CopiesModal.vue';
import ContinueLearning from '../ContinueLearning.vue';

describe('ContinueLearning', () => {
  afterEach(() => setResumableContentNodes([]));

  it('opens the locations dialog without navigating from Continue learning on your own', async () => {
    const copies = [
      { id: 'first', title: 'First copy', ancestors: [] },
      { id: 'second', title: 'Second copy', ancestors: [] },
    ];
    setResumableContentNodes(
      copies.map(copy => ({
        ...copy,
        is_leaf: true,
        learning_activities: [],
        content_id: 'shared',
      })),
    );
    const router = new VueRouter({
      mode: 'abstract',
      routes: [{ path: '/topics/c/:id', name: PageNames.TOPICS_CONTENT }],
    });
    render(ContinueLearning, { routes: router });
    const initialRoute = router.currentRoute;
    const { copies$ } = createTranslator(CopiesModal.name, CopiesModal.$trs);

    const locations = await screen.findByTestId('resource-copies');

    await userEvent.setup().click(locations);

    const dialog = screen.getByRole('dialog', { name: copies$() });
    for (const copy of copies) {
      expect(within(dialog).getByRole('link', { name: copy.title })).toBeVisible();
    }
    expect(router.currentRoute).toBe(initialRoute);
  });
});
