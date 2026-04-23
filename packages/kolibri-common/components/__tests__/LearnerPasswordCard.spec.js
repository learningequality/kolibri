import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import LearnerPasswordCard from '../LearnerPasswordCard.vue';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri-common/utils/picturePassword', () => ({
  getPicturePasswordIcons: jest.fn(pw => {
    if (pw === '3.7.12')
      return [
        { label: 'testIcon1', iconName: 'moonColorful' },
        { label: 'testIcon2', iconName: 'waterColorful' },
        { label: 'testIcon3', iconName: 'birdColorful' },
      ];
    return [];
  }),
}));

const LEARNER_WITH_PASSWORD = {
  id: 'u1',
  full_name: 'Alice Smith',
  username: 'alice',
  picture_password: '3.7.12',
};

const LEARNER_WITHOUT_PASSWORD = {
  id: 'u2',
  full_name: 'Bob Jones',
  username: 'bob',
  picture_password: null,
};

function renderCard(props = {}) {
  return render(LearnerPasswordCard, {
    props: { learner: LEARNER_WITH_PASSWORD, ...props },
  });
}

describe('LearnerPasswordCard', () => {
  beforeEach(() => {
    useFacility.mockImplementation(() =>
      useFacilityMock({
        facilityConfig: ref({
          picture_password_settings: { icon_style: PicturePasswordIconStyle.COLORFUL },
        }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the learner full name', () => {
    renderCard();
    expect(screen.getByText(LEARNER_WITH_PASSWORD.full_name)).toBeInTheDocument();
  });

  it('renders the learner username', () => {
    renderCard();
    expect(screen.getByText(LEARNER_WITH_PASSWORD.username)).toBeInTheDocument();
  });

  describe('when the learner has no picture password', () => {
    it('renders NoPasswordInfo', () => {
      renderCard({ learner: LEARNER_WITHOUT_PASSWORD });
      expect(
        screen.getByText(picturePasswordStrings.noPicturePasswordDescription$()),
      ).toBeInTheDocument();
    });
  });

  describe('when printFormat is "text"', () => {
    it('renders icon labels joined by " - "', () => {
      renderCard({ printFormat: 'text' });
      expect(screen.getByText('testIcon1 - testIcon2 - testIcon3')).toBeInTheDocument();
    });

    it('does not render the icon image sequence', () => {
      renderCard({ printFormat: 'text' });
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('when printFormat is "images" (default)', () => {
    it('renders the UserPicturePassword icon sequence', () => {
      renderCard();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('does not render the text sequence', () => {
      renderCard();
      expect(screen.queryByText('testIcon1 - testIcon2 - testIcon3')).not.toBeInTheDocument();
    });
  });
});
