import { ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import AllPasswordsPage from '../AllPasswordsPage.vue';

const { noPicturePasswordDescription$, printAction$, noLearnersInClass$ } = picturePasswordStrings;

const CLASS_NAME = 'Test Class';
const FACILITY_NAME = 'Test Facility';
const LEARNERS = {
  alice: { id: 'u1', full_name: 'Alice Smith', username: 'alice', picture_password: '3.7.12' },
  bob: { id: 'u2', full_name: 'Bob Jones', username: 'bob', picture_password: null },
};
const ICON_LABELS = ['testIcon1', 'testIcon2', 'testIcon3'];

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: {}, query: {}, name: null })),
  useRouter: jest.fn(() => ({ push: jest.fn(), currentRoute: {} })),
}));

jest.mock('kolibri-common/utils/picturePassword', () => ({
  getPicturePasswordIcons: jest.fn(pw => {
    if (pw === '3.7.12') return ICON_LABELS.map(label => ({ label }));
    return [];
  }),
}));

function renderComponent(props = {}) {
  return render(AllPasswordsPage, {
    props: {
      learners: Object.values(LEARNERS),
      className: CLASS_NAME,
      facilityName: FACILITY_NAME,
      ...props,
    },
    routes: [],
  });
}

describe('AllPasswordsPage', () => {
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowBreakpoint: ref(4),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('learner list', () => {
    it('renders the full name of each learner', () => {
      renderComponent();
      expect(screen.getByText(LEARNERS.alice.full_name)).toBeInTheDocument();
      expect(screen.getByText(LEARNERS.bob.full_name)).toBeInTheDocument();
    });

    it('renders the username of each learner', () => {
      renderComponent();
      expect(screen.getByText(LEARNERS.alice.username)).toBeInTheDocument();
      expect(screen.getByText(LEARNERS.bob.username)).toBeInTheDocument();
    });

    it('renders resolved icon labels for a learner with a picture_password', () => {
      renderComponent();
      ICON_LABELS.forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
    });

    it('renders the "no password" description for a learner with picture_password=null', () => {
      renderComponent();
      expect(screen.getByText(noPicturePasswordDescription$())).toBeInTheDocument();
    });

    it('renders one row per learner', () => {
      renderComponent();
      const rows = screen.getAllByRole('row');
      // 1 header row + 2 learner rows
      expect(rows).toHaveLength(3);
    });
  });

  describe('print button', () => {
    it('renders a Print button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: printAction$() })).toBeInTheDocument();
    });
  });

  describe('print dialog', () => {
    it('opens the print format dialog when the Print button is clicked', async () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: picturePasswordStrings.printAction$() }));
      await global.flushPromises();
      expect(
        screen.getByText(picturePasswordStrings.printPasswordsDialogHeader$()),
      ).toBeInTheDocument();
    });

    it('shows hyphenated icon labels in the preview when text format is selected', async () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: picturePasswordStrings.printAction$() }));
      await global.flushPromises();
      fireEvent.click(
        screen.getByRole('radio', { name: picturePasswordStrings.printWithTextOnly$() }),
      );
      await global.flushPromises();
      expect(screen.getByText(ICON_LABELS.join(' - '))).toBeInTheDocument();
    });
  });

  describe('when the learners prop is an empty list', () => {
    it('renders no learner content', () => {
      renderComponent({ learners: [] });
      expect(screen.queryByText(LEARNERS.alice.full_name)).not.toBeInTheDocument();
      expect(screen.queryByText(LEARNERS.bob.full_name)).not.toBeInTheDocument();
    });

    it('renders the empty class message', () => {
      renderComponent({ learners: [] });
      expect(screen.getByText(noLearnersInClass$())).toBeInTheDocument();
    });
  });
});
