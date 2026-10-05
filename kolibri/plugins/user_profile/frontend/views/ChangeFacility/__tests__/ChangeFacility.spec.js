import { computed, nextTick } from 'vue';
import { render, screen, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { syncStrings } from 'kolibri-common/mixins/commonSyncElements';
import { profileStrings } from '../../commonProfileStrings';
import ChangeFacility from '../index';
import SelectFacility from '../SelectFacility';
import ConfirmChangeFacility from '../ConfirmChangeFacility';
import ConfirmAccountUsername, {
  pageTitleStrings as confirmAccountUsernameStrings,
} from '../ConfirmAccountUsername';
import CreatePassword, { pageTitleStrings as createPasswordStrings } from '../CreatePassword';
import ChooseAdmin, { pageTitleStrings as chooseAdminStrings } from '../ChooseAdmin';
import ConfirmMerge from '../ConfirmMerge';
import MergeFacility, { pageTitleStrings as mergeFacilityStrings } from '../MergeFacility';
import CreateAccount from '../CreateAccount';
import UsernameExists from '../UsernameExists';
import MergeAccountDialog from '../MergeAccountDialog';
import ConfirmAccountDetails, {
  pageTitleStrings as confirmAccountDetailsStrings,
} from '../MergeAccountDialog/ConfirmAccountDetails';
import MergeDifferentAccounts from '../MergeDifferentAccounts';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/apiResources/TaskResource', () => ({
  list: jest.fn(() => new Promise(() => {})),
}));
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  list: jest.fn(() => new Promise(() => {})),
}));
jest.mock('kolibri-common/apiResources/NetworkLocationResource', () => ({
  NetworkLocationResource: { list: jest.fn(() => new Promise(() => {})) },
}));

const TARGET_FACILITY = { id: 'target-facility', name: 'Target', url: 'http://target' };

function pageHeadings() {
  return screen.queryAllByRole('heading', { level: 1 });
}

describe('ChangeFacility page title', () => {
  beforeEach(() => {
    document.title = '';
    useUser.mockImplementation(() => useUserMock());
  });

  it("titles the tab with the Select learning facility step's heading, the only h1", async () => {
    const router = new VueRouter({
      routes: [
        {
          path: '/change_facility',
          name: 'CHANGE_FACILITY',
          component: ChangeFacility,
          children: [{ path: 'change', name: 'SELECT_FACILITY', component: SelectFacility }],
        },
      ],
    });
    router.getRoute = () => ({});
    await router.push({ name: 'SELECT_FACILITY' });
    render({ render: h => h('router-view') }, { router });
    const { selectFacilityTitle$ } = syncStrings;
    await waitFor(() => expect(document.title).toBe(`${selectFacilityTitle$()} - Kolibri`));
    const headings = pageHeadings();
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(selectFacilityTitle$());
  });

  describe.each([
    { Step: ConfirmChangeFacility, title$: coreStrings.changeLearningFacility$ },
    { Step: ConfirmAccountUsername, title$: confirmAccountUsernameStrings.documentTitle$ },
    { Step: CreatePassword, title$: createPasswordStrings.documentTitle$ },
    { Step: ChooseAdmin, title$: chooseAdminStrings.documentTitle$ },
    { Step: ConfirmMerge, title$: profileStrings.mergeAccounts$ },
    { Step: MergeFacility, title$: mergeFacilityStrings.documentTitle$ },
    { Step: CreateAccount, title$: profileStrings.createAccount$ },
    { Step: UsernameExists, title$: coreStrings.changeLearningFacility$ },
    { Step: MergeAccountDialog, title$: profileStrings.mergeAccounts$ },
    { Step: ConfirmAccountDetails, title$: confirmAccountDetailsStrings.documentTitle$ },
    { Step: MergeDifferentAccounts, title$: profileStrings.mergeAccounts$ },
  ])('$Step.name', ({ Step, title$ }) => {
    it("titles the tab with the step's h1, leaving one h1", async () => {
      render(
        {
          components: { ImmersivePage, Step },
          template: '<ImmersivePage><Step /></ImmersivePage>',
        },
        {
          routes: [],
          provide: {
            changeFacilityService: { send: jest.fn() },
            state: computed(() => ({
              targetFacility: TARGET_FACILITY,
              targetAccount: { username: 'target-user' },
              username: 'local-user',
            })),
          },
        },
      );
      await nextTick();
      expect(document.title).toBe(`${title$()} - Kolibri`);
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(title$());
    });
  });
});
