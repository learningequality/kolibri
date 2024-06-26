import { interpret } from 'xstate';
import { LodTypePresets } from 'kolibri.coreVue.vuex.constants';
import { getImportLodUsersMachine } from '../importLodUsersMachine';

describe('importLodUsersMachine', () => {
  it('should return a machine', () => {
    const machine = getImportLodUsersMachine();
    expect(machine).toBeDefined();
  });

  describe('import single user by auth flow', () => {
    const service = interpret(getImportLodUsersMachine());
    service.start();

    it('Being at the initial state, should be able to set the lod type as import, and the deviceId to import from', () => {
      // at selectLodSetupType state
      const deviceId = 'test-device-id';

      service.send({
        type: 'CONTINUE',
        value: {
          importOrJoin: LodTypePresets.IMPORT,
          importDeviceId: deviceId,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.lodImportOrJoin).toBe(LodTypePresets.IMPORT);
      expect(context.importDeviceId).toBe(deviceId);
      expect(state.value).toBe('selectLodFacility');
    });

    it('Should be able to select a facility to import users from, and set the importDevice and how many facilities there are', () => {
      // at selectLodFacility state
      const selectedFacility = { id: 'test-facility-id' };
      const importDevice = { id: 'test-device-id' };
      const facilitiesCount = 2;

      service.send({
        type: 'CONTINUE',
        value: {
          selectedFacility,
          importDevice,
          facilitiesCount,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.selectedFacility).toBe(selectedFacility);
      expect(context.importDevice).toBe(importDevice);
      expect(context.facilitiesOnDeviceCount).toBe(facilitiesCount);
      expect(context.importDeviceId).toBe(importDevice.id);
      expect(state.value).toBe('lodImportUserAuth');
    });

    it('should be able to add user being imported', () => {
      // at lodImportUserAuth state
      const user = { id: 'test-user-id' };

      service.send({
        type: 'ADD_USER_BEING_IMPORTED',
        value: user,
      });

      const { context } = service.getSnapshot();
      expect(context.usersBeingImported).toEqual([user]);
    });

    it('should continue to the loading state', () => {
      // at lodImportUserAuth state
      service.send('CONTINUE');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodLoading');
    });

    it('should be able to import another user', () => {
      // at lodLoading state
      service.send('IMPORT_ANOTHER');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodImportUserAuth');
    });

    it('should be able to finish the flow', () => {
      // at lodLoading state
      service.send('FINISH');

      const state = service.getSnapshot();
      expect(state.value).toBe('finish');
    });
  });

  describe('import users as admin flow', () => {
    const service = interpret(getImportLodUsersMachine());
    service.start();

    it('Being at the initial state, should be able to set the lod type as import, and the deviceId to import from', () => {
      // at selectLodSetupType state
      const deviceId = 'test-device-id';

      service.send({
        type: 'CONTINUE',
        value: {
          importOrJoin: LodTypePresets.IMPORT,
          importDeviceId: deviceId,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.lodImportOrJoin).toBe(LodTypePresets.IMPORT);
      expect(context.importDeviceId).toBe(deviceId);
      expect(state.value).toBe('selectLodFacility');
    });

    it('Should be able to select a facility to import users from, and set the importDevice and how many facilities there are', () => {
      // at selectLodFacility state
      const selectedFacility = { id: 'test-facility-id' };
      const importDevice = { id: 'test-device-id' };
      const facilitiesCount = 2;

      service.send({
        type: 'CONTINUE',
        value: {
          selectedFacility,
          importDevice,
          facilitiesCount,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.selectedFacility).toBe(selectedFacility);
      expect(context.importDevice).toBe(importDevice);
      expect(context.facilitiesOnDeviceCount).toBe(facilitiesCount);
      expect(context.importDeviceId).toBe(importDevice.id);
      expect(state.value).toBe('lodImportUserAuth');
    });

    it('should be able to continue as admin and set remote users', () => {
      // at lodImportUserAuth state
      const remoteUsers = [{ id: 'test-user-id1' }, { id: 'test-user-id2' }];
      const remoteAdmin = { id: 'test-admin-id', username: 'username', password: 'password' };

      service.send({
        type: 'CONTINUEADMIN',
        value: {
          users: remoteUsers,
          adminUsername: remoteAdmin.username,
          adminPassword: remoteAdmin.password,
          id: remoteAdmin.id,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.remoteUsers).toEqual(remoteUsers);
      expect(context.remoteAdmin).toEqual(remoteAdmin);
      expect(state.value).toBe('lodImportAsAdmin');
    });

    it('should be able to add user being imported', () => {
      // at lodImportAsAdmin state
      const user = { id: 'test-user-id' };

      service.send({
        type: 'ADD_USER_BEING_IMPORTED',
        value: user,
      });

      const { context } = service.getSnapshot();
      expect(context.usersBeingImported).toEqual([user]);
    });

    it('should be able to go to the loading page', () => {
      // at lodImportAsAdmin state
      service.send('LOADING');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodLoading');
    });

    it('should be able to import another user', () => {
      // at lodLoading state
      service.send('IMPORT_ANOTHER');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodImportUserAuth');
    });

    it('should be able to finish the flow', () => {
      // at lodLoading state
      service.send('FINISH');

      const state = service.getSnapshot();
      expect(state.value).toBe('finish');
    });
  });

  describe('Join facility creating a new user flow', () => {
    const service = interpret(getImportLodUsersMachine());
    service.start();

    it('Being at the initial state, should be able to set the lod type as join, and the deviceId to import from', () => {
      // at selectLodSetupType state
      const deviceId = 'test-device-id';

      service.send({
        type: 'CONTINUE',
        value: {
          importOrJoin: LodTypePresets.JOIN,
          importDeviceId: deviceId,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.lodImportOrJoin).toBe(LodTypePresets.JOIN);
      expect(context.importDeviceId).toBe(deviceId);
      expect(state.value).toBe('selectLodFacility');
    });

    it('Should be able to select a facility to import users from, and set the importDevice and how many facilities there are', () => {
      // at selectLodFacility state
      const selectedFacility = { id: 'test-facility-id' };
      const importDevice = { id: 'test-device-id' };
      const facilitiesCount = 2;

      service.send({
        type: 'CONTINUE',
        value: {
          selectedFacility,
          importDevice,
          facilitiesCount,
        },
      });

      const state = service.getSnapshot();
      const { context } = state;
      expect(context.selectedFacility).toBe(selectedFacility);
      expect(context.importDevice).toBe(importDevice);
      expect(context.facilitiesOnDeviceCount).toBe(facilitiesCount);
      expect(context.importDeviceId).toBe(importDevice.id);
      expect(state.value).toBe('lodJoinFacility');
    });

    it('should be able to add user being imported', () => {
      // at lodJoinFacility state
      const user = { id: 'test-user-id' };

      service.send({
        type: 'ADD_USER_BEING_IMPORTED',
        value: user,
      });

      const { context } = service.getSnapshot();
      expect(context.usersBeingImported).toEqual([user]);
    });

    it('should continue to the loading state', () => {
      // at lodJoinFacility state
      service.send('CONTINUE');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodJoinLoading');
    });

    it('should be able to import another user', () => {
      // at lodJoinLoading state
      service.send('IMPORT_ANOTHER');

      const state = service.getSnapshot();
      expect(state.value).toBe('lodImportUserAuth');
    });

    it('should be able to finish the flow', () => {
      // at lodJoinLoading state
      service.send('FINISH');

      const state = service.getSnapshot();
      expect(state.value).toBe('finish');
    });
  });
});
