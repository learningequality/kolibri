import { nextTick } from 'vue';
import { render } from '@testing-library/vue';
import { error } from 'kolibri/utils/appError';
import SetupWizardIndex from '../SetupWizardIndex';
import routes from '../../routes';
import { pageTitleStrings } from '../pageTitleStrings';

jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { canGetOSUser: false },
}));

const { setupWizardPageTitle$ } = pageTitleStrings;

// Loading keeps the step's router-view out of the render. Starting off '/' keeps created()'s
// replace('/') from rejecting as a duplicate navigation.
function renderWizard() {
  return render(
    SetupWizardIndex,
    { routes, store: { state: { loading: true, error: null } } },
    (localVue, store, router) => {
      router.push('/default-language');
    },
  );
}

describe('SetupWizardIndex page title', () => {
  beforeEach(() => {
    document.title = '';
    error.value = null;
  });

  it('keeps the wizard title while an app error is set', async () => {
    renderWizard();
    await nextTick();
    expect(document.title).toBe(`${setupWizardPageTitle$()} - Kolibri`);
    error.value = 'boom';
    await nextTick();
    expect(document.title).toBe(`${setupWizardPageTitle$()} - Kolibri`);
  });
});
