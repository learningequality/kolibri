<template>

  <ImmersivePage
    :primary="false"
    :appBarTitle="deviceString('importUserLabel')"
    @navIconClick="importUserService.send('RESET_IMPORT')"
  >
    <KPageContainer class="device-container">
      <h1> {{ $tr("selectAUser") }}</h1>
      <UsersList
        isSearchable
        :users="remoteUsers"
      >
        <template #action="{ user }">
          <KButton
            :text="coreString('importAction')"
            appearance="flat-button"
            @click="startImport(user)"
          />
        </template>
      </UsersList>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import { TaskResource } from 'kolibri.resources';
  import commonDeviceStrings from '../../../views/commonDeviceStrings';
  import UsersList from '../UsersList.vue';

  export default {
    name: 'ImportUserAsAdmin',
    inject: ['importUserService'],
    components: {
      UsersList,
      ImmersivePage,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    computed: {
      remoteUsers() {
        return this.importUserService.state.context.remoteUsers;
      },
      facility() {
        return this.importUserService.state.context.selectedFacility;
      },
      deviceId() {
        return this.importUserService.state.context.importDeviceId;
      },
    },
    methods: {
      async startImport(learner) {
        const task_name = 'kolibri.core.auth.tasks.peeruserimport';
        const params = {
          type: task_name,
          ...this.importUserService.state.context.lodAdmin,
          facility: this.facility.id,
          facility_name: this.facility.name,
          device_id: this.deviceId,
          user_id: learner.id,
          using_admin: true,
        };
        await TaskResource.startTask(params);
        this.importUserService.send({
          type: 'ADD_USER_BEING_IMPORTED',
          value: {
            id: learner.id,
            full_name: learner.full_name,
            username: learner.username,
          },
        });
        this.importUserService.send({
          type: 'RESET_IMPORT',
        });
      },
    },
    $trs: {
      selectAUser: 'Select a user',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

</style>
