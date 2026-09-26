import { render, waitFor } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import TaskResource from 'kolibri/apiResources/TaskResource';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { Presets } from 'kolibri/constants';
import SettingUpKolibri from '../onboarding-forms/SettingUpKolibri';
import { SetupWizardResource } from '../../api';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { canGetOSUser: true },
}));
jest.mock('kolibri/apiResources/TaskResource', () => ({
  startTask: jest.fn().mockResolvedValue({}),
  // Never resolves, so the component stays on the provisioning screen
  list: jest.fn(() => new Promise(() => {})),
}));
jest.mock('../../api', () => ({
  SetupWizardResource: { osuser: jest.fn() },
}));

const { onMyOwnDeviceName$, onMyOwnFacilityName$ } = createTranslator(
  SettingUpKolibri.name,
  SettingUpKolibri.$trs,
);

describe('SettingUpKolibri', () => {
  it('names the device and facility after the OS user', async () => {
    const name = 'Jane Doe';
    useUser.mockImplementation(() => useUserMock({ isAppContext: true }));
    SetupWizardResource.osuser.mockResolvedValue({ name });

    render(SettingUpKolibri, {
      provide: {
        wizardService: {
          send: jest.fn(),
          state: { context: { onMyOwnOrGroup: Presets.PERSONAL } },
        },
      },
    });

    await waitFor(() => expect(TaskResource.startTask).toHaveBeenCalled());
    expect(TaskResource.startTask).toHaveBeenCalledWith(
      expect.objectContaining({
        device_name: onMyOwnDeviceName$({ name }),
        facility: { name: onMyOwnFacilityName$({ name }) },
      }),
    );
  });
});
