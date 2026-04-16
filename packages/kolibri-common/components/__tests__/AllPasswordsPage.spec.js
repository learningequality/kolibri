import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import AllPasswordsPage from '../AllPasswordsPage.vue';

const { noPicturePasswordDescription$, printAction$, noLearnersInClass$ } = picturePasswordStrings;

const CLASS_ID = 'class-abc';
const LEARNERS = {
  alice: { id: 'u1', full_name: 'Alice Smith', username: 'alice', picture_password: '3.7.12' },
  bob: { id: 'u2', full_name: 'Bob Jones', username: 'bob', picture_password: null },
};
const ICON_LABELS = ['testIcon1', 'testIcon2', 'testIcon3'];

jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  fetchCollection: jest.fn(),
}));

jest.mock('kolibri-common/apiResources/ClassroomResource', () => ({
  fetchModel: jest.fn(),
}));

jest.mock('kolibri-common/composables/useFacility', () => ({
  default: jest.fn(() => ({
    currentFacilityName: ref('Test Facility'),
    facilityConfig: ref({
      picture_password_settings: { icon_style: 'colorful' },
    }),
  })),
}));

jest.mock('kolibri-common/utils/picturePassword', () => ({
  getPicturePasswordIcons: jest.fn(pw => {
    if (pw === '3.7.12') return ICON_LABELS.map(label => ({ label }));
    return [];
  }),
}));
function renderComponent(props = {}) {
  return render(AllPasswordsPage, {
    props: { classId: CLASS_ID, ...props },
    routes: [],
  });
}

describe('AllPasswordsPage', () => {
  beforeEach(() => {
    FacilityUserResource.fetchCollection.mockResolvedValue(Object.values(LEARNERS));
    ClassroomResource.fetchModel.mockResolvedValue({ name: 'Test Class' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows a loading indicator before the fetch resolves', () => {
      // Do not resolve the promise so we can inspect the loading state
      FacilityUserResource.fetchCollection.mockImplementation(() => new Promise(() => {}));
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hides the loading indicator after the fetch resolves', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('data fetching', () => {
    it('calls FacilityUserResource.fetchCollection with the classId as member_of', async () => {
      renderComponent();
      await global.flushPromises();
      expect(FacilityUserResource.fetchCollection).toHaveBeenCalledWith(
        expect.objectContaining({ getParams: expect.objectContaining({ member_of: CLASS_ID }) }),
      );
    });
  });

  describe('learner list', () => {
    it('renders the full name of each learner', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.getByText(LEARNERS['alice'].full_name)).toBeInTheDocument();
      expect(screen.getByText(LEARNERS['bob'].full_name)).toBeInTheDocument();
    });

    it('renders the username of each learner', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.getByText(LEARNERS['alice'].username)).toBeInTheDocument();
      expect(screen.getByText(LEARNERS['bob'].username)).toBeInTheDocument();
    });

    it('renders resolved icon labels for a learner with a picture_password', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.getByText(ICON_LABELS.join(', '))).toBeInTheDocument();
    });

    it('renders the "no password" description for a learner with picture_password=null', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.getByText(noPicturePasswordDescription$())).toBeInTheDocument();
    });

    it('renders one row per learner', async () => {
      renderComponent();
      await global.flushPromises();
      // One row per learner in tbody
      const rows = screen.getAllByRole('row');
      // 1 header row + 2 learner rows
      expect(rows).toHaveLength(3);
    });
  });

  describe('print button', () => {
    it('renders a Print button', async () => {
      renderComponent();
      await global.flushPromises();
      expect(screen.getByRole('button', { name: printAction$() })).toBeInTheDocument();
    });
  });

  describe('when the fetch returns an empty list', () => {
    it('renders no learner rows', async () => {
      FacilityUserResource.fetchCollection.mockResolvedValue([]);
      renderComponent();
      await global.flushPromises();
      // Only the header row
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(1);
    });

    it('renders the empty class message', async () => {
      FacilityUserResource.fetchCollection.mockResolvedValue([]);
      renderComponent();
      await global.flushPromises();
      expect(screen.getByText(noLearnersInClass$())).toBeInTheDocument();
    });
  });
});
