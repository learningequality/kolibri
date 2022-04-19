import { createMachine, assign } from 'xstate';
import SelectFacilityForm from '../views/importLODUsers/SelectFacilityForm.vue';
import ImportIndividualUserForm from '../views/importLODUsers/ImportIndividualUserForm.vue';
import LoadingTaskPage from '../views/importLODUsers/LoadingTaskPage';
import MultipleUsers from '../views/importLODUsers/MultipleUsers';
import { SetupSoUDTasksResource } from '../api';

const getDevice = data => ({
  name: data.device_name,
  id: data.device_id,
  baseurl: data.device_address,
  facilities: [...data.facilities],
});

const assignDevice = assign((_, event) => {
  const _device = getDevice(event.value);
  const _facility = { name: null, id: null, adminuser: null, adminpassword: null };
  if (_device.facilities.length === 1) {
    _facility.name = _device.facilities[0].name;
    _facility.id = _device.facilities[0].id;
  }
  const total_steps = _device.facilities.length === 1 ? 3 : 4;
  return {
    device: _device,
    facilities: _device.facilities,
    facility: _facility,
    steps: total_steps,
  };
});

const assignFacility = assign((_, event) => {
  const ctx = { facility: event.value.facility };
  if (event.value.device) {
    ctx['device'] = getDevice(event.value.device);
    ctx['total_steps'] = 3;
  }
  return ctx;
});

const importUser = assign((context, event) => {
  const user = {
    id: event.value.id,
    username: event.value.username,
    password: event.value.password,
    full_name: event.value.full_name,
    task: event.value.task.id,
  };
  context.users.push(user);
  return {
    task: event.value.task,
  };
});

const registerUsersAndSyncAdmin = assign((context, event) => {
  context.facility['adminUser'] = event.value.adminUsername;
  context.facility['adminPassword'] = event.value.adminPassword;
  context.facility['adminId'] = event.value.adminId;
  const task_name = 'kolibri.plugins.setup_wizard.tasks.startprovisionsoud';
  const params = {
    baseurl: context.device.baseurl,
    username: context.facility.adminUser,
    password: context.facility.adminPassword,
    user_id: context.facility.adminId,
    facility_id: context.facility.id,
    device_name: context.device.name,
  };
  SetupSoUDTasksResource.createTask(task_name, params);
  return {
    remoteStudents: event.value.users,
  };
});

export const lodImportMachine = createMachine({
  initial: 'selectFacility',
  context: {
    step: 1,
    steps: 4,
    device: { name: null, id: null, baseurl: null },
    facilities: [],
    facility: { name: null, id: null, adminUser: null, adminPassword: null, adminTask: null },
    users: [],
    remoteStudents: [],
    task: null,
  },
  states: {
    selectFacility: {
      meta: { step: '1', component: SelectFacilityForm },
      on: {
        CONTINUE: { target: 'userCredentials', actions: assignFacility },
        DEVICE_DATA: { actions: assignDevice },
      },
    },
    userCredentials: {
      meta: { step: '2', component: ImportIndividualUserForm },
      on: {
        CONTINUE: { target: 'importingUser', actions: importUser },
        CONTINUEADMIN: { target: 'syncAdminUser', actions: registerUsersAndSyncAdmin },
        BACK: 'selectFacility',
      },
    },
    importingUser: {
      meta: { step: '3', component: LoadingTaskPage },
      on: {
        BACK: 'userCredentials',
      },
    },
    syncAdminUser: {
      meta: { step: '3', component: MultipleUsers },
      on: {
        CONTINUE: { target: 'selectUsers' },
      },
    },
    selectUsers: {
      meta: { step: '3', component: MultipleUsers },
      on: {
        CONTINUE: { target: 'importingSingleUser', actions: importUser },
        BACK: 'userCredentials',
      },
    },
    importingSingleUser: {
      meta: { step: '4', component: LoadingTaskPage },
      on: {
        BACK: { target: 'selectUsers' },
      },
    },
    modalCoachAdmins: {},
  },
});
