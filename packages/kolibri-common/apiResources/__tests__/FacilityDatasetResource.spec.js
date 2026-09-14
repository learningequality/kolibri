import client from 'kolibri/client';
import urls from 'kolibri/urls';
import FacilityDatasetResource from '../FacilityDatasetResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('FacilityDatasetResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  it('POSTs the pin code to set a PIN', async () => {
    await FacilityDatasetResource.setPin('ds-1', { pin_code: '9999' });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/kolibri:core:facilitydataset_update_pin/ds-1',
        data: { pin_code: '9999' },
      }),
    );
  });

  it('PATCHes the same endpoint with no body to unset a PIN', async () => {
    await FacilityDatasetResource.unsetPin('ds-1');

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/kolibri:core:facilitydataset_update_pin/ds-1',
        data: undefined,
      }),
    );
  });

  it('PATCHes the login settings endpoint and resolves with the response body', async () => {
    client.__setPayload({ dataset: { id: 'ds-1' }, task: { id: 'task-1' } });

    const result = await FacilityDatasetResource.saveLoginSettings('ds-1', {
      learner_can_login_with_no_password: true,
    });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/kolibri:core:facilitydataset_save_facility_login_settings/ds-1',
        data: { learner_can_login_with_no_password: true },
      }),
    );
    expect(result).toEqual({ dataset: { id: 'ds-1' }, task: { id: 'task-1' } });
  });
});
