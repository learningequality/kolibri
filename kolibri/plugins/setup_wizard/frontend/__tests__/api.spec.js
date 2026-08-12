import client from 'kolibri/client';
import { SetupWizardResource, FacilityImportResource } from '../api';

jest.mock('kolibri/client');
// Not the shared urls mock: it resolves every name to the same string, so a wrong `action`
// would pass.
jest.mock('kolibri/urls', () => ({
  __esModule: true,
  default: new Proxy({}, { get: (target, name) => () => name }),
}));

describe('setup_wizard resources', () => {
  beforeEach(() => {
    client.__reset();
  });

  it('posts a remote user creation and resolves the response body', async () => {
    client.__setPayload({ status: 201, errors: [] });
    const user = {
      facility_id: 'facility_1',
      username: 'learner',
      password: 'password',
      full_name: 'A Learner',
      baseurl: 'http://kolibri.remote',
    };
    const result = await SetupWizardResource.createuseronremote(user);
    expect(client.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: expect.stringMatching(/setupwizard_createuseronremote$/),
      data: user,
    });
    expect(result).toEqual({ status: 201, errors: [] });
  });

  it('gets the facility admins and resolves the list', async () => {
    client.__setPayload([{ id: 'admin_1', username: 'admin' }]);
    const result = await FacilityImportResource.facilityadmins();
    expect(client.mock.calls[0][0]).toMatchObject({
      method: 'GET',
      url: expect.stringMatching(/facilityimport_facilityadmins$/),
    });
    expect(result).toEqual([{ id: 'admin_1', username: 'admin' }]);
  });

  it('posts the superuser grant as a body', async () => {
    await FacilityImportResource.grantsuperuserpermissions({
      user_id: 'user_1',
      password: 'password',
    });
    expect(client.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: expect.stringMatching(/facilityimport_grantsuperuserpermissions$/),
      data: { user_id: 'user_1', password: 'password' },
    });
  });

  it('posts the new superuser as a body', async () => {
    const superuser = {
      username: 'admin',
      full_name: 'An Admin',
      password: 'password',
      extra_fields: {},
      facility_name: 'Kolibri School',
    };
    await FacilityImportResource.createsuperuser(superuser);
    expect(client.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: expect.stringMatching(/facilityimport_createsuperuser$/),
      data: superuser,
    });
  });
});
