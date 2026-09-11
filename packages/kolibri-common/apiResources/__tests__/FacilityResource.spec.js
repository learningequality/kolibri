import client from 'kolibri/client';
import urls from 'kolibri/urls';
import FacilityResource from '../FacilityResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('FacilityResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  it('POSTs a new facility to the create_facility action, not the list endpoint', async () => {
    await FacilityResource.createFacility({ name: 'Facility', preset: 'formal' });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/kolibri:core:facility_create_facility',
        data: { name: 'Facility', preset: 'formal' },
      }),
    );
  });
});
