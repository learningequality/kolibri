<template>

  <ImmersivePage
    :primary="false"
    :appBarTitle="importUserLabel$()"
    :loading="usersLoading || taskLoading"
    @navIconClick="importLodMachineService.send('RESET_IMPORT')"
  >
    <KPageContainer class="device-container">
      <h1>{{ selectAUser$() }}</h1>
      <KCircularLoader v-if="usersLoading" />
      <UsersList
        v-else
        isSearchable
        :users="usersList"
      >
        <template #action="{ user }">
          <KButton
            :text="importAction$()"
            appearance="flat-button"
            :disabled="taskLoading"
            @click="startImport(user)"
          />
        </template>
      </UsersList>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';

  import UsersList from '../UsersList.vue';
  import { injectLodDeviceUsers } from '../composables/useLodDeviceUsers';

  export default {
    name: 'ImportUserAsAdmin',
    components: {
      UsersList,
      ImmersivePage,
    },
    setup() {
      const {
        remoteAdmin,
        remoteUsers,
        importDeviceId,
        selectedFacility,
        users: localUsers,
        usersBeingImported,
        loading: usersLoading,
        importLodMachineService,
      } = injectLodDeviceUsers();

      const { importAction$ } = coreStrings;
      const { selectAUser$, importUserLabel$, importUserError$ } = lodUsersManagementStrings;

      return {
        remoteAdmin,
        localUsers,
        remoteUsers,
        usersLoading,
        importDeviceId,
        selectedFacility,
        usersBeingImported,
        importLodMachineService,
        selectAUser$,
        importAction$,
        importUserLabel$,
        importUserError$,
      };
    },
    data: () => {
      return {
        taskLoading: false,
      };
    },
    computed: {
      usersList() {
        return this.remoteUsers.map(user => ({
          ...user,
          isImported: this.localUsers.some(localUser => localUser.id === user.id),
          isImporting: this.usersBeingImported.some(importingUser => importingUser.id === user.id),
        }));
      },
    },
    methods: {
      async startImport(learner) {
        const task_name = TaskTypes.IMPORTLODUSER;
        const params = {
          type: task_name,
          ...this.remoteAdmin,
          facility: this.selectedFacility.id,
          facility_name: this.selectedFacility.name,
          device_id: this.importDeviceId,
          user_id: learner.id,
          using_admin: true,
        };
        this.taskLoading = true;
        try {
          const result = await TaskResource.startTask(params);
          this.importLodMachineService.send({
            type: 'ADD_USER_BEING_IMPORTED',
            value: {
              id: learner.id,
              full_name: learner.full_name,
              username: learner.username,
              taskId: result.id,
            },
          });
          this.importLodMachineService.send({
            type: 'RESET_IMPORT',
          });
        } catch (error) {
          this.$store.dispatch('createSnackbar', this.importUserError$());
        }
        this.taskLoading = false;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

</style>
