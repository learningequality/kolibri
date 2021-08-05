<template>

  <OnboardingForm
    :header="$tr('loadingUserTitle')"
  >
    <FacilityTaskPanel
      v-if="loadingTask.status"
      :task="loadingTask"
      @cancel="cancelTask"
    />
    <div v-if="usersDevice.length > 0">
      <p class="this-device">
        {{ $tr('onThisDevice') }}
      </p>
      <ul>
        <li v-for="u in usersDevice" :key="u.username">
          {{ u.full_name }}
        </li>
      </ul>

    </div>
    <template #buttons>
      <div v-if="loadingTask.status === 'COMPLETED'">
        <KButton
          primary
          :text="coreString('finishAction')"
          @click="welcomeModal = true"
        />
        <KButton
          class="another-user"
          :text="$tr('importAnother')"
          appearance="basic-link"
          @click="retryImport"
        />
      </div>
      <KButton
        v-else-if="loadingTask.status === 'FAILED'"
        primary
        :text="coreString('retryAction')"
        @click="retryImport"
      />
      <span v-else></span>
    </template>
    <WelcomeModal
      v-if="welcomeModal"
      :importedFacility="facility"
      :isLOD="true"
      @submit="loginFirstUser"
    />
  </OnboardingForm>

</template>


<script>

  import urls from 'kolibri.urls';
  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import { SessionResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import FacilityTaskPanel from '../../../../../device/assets/src/views/FacilitiesPage/FacilityTaskPanel.vue';
  import WelcomeModal from '../../../../../device/assets/src/views/WelcomeModal.vue';
  import { TaskStatuses } from '../../../../../device/assets/src/constants.js';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import { SetupTasksResource } from '../../api';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingForm,
      WelcomeModal,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      return {
        loadingTask: {},
        isPolling: false,
        welcomeModal: false,
        user: null,
      };
    },
    inject: ['lodService', 'state'],
    computed: {
      usersDevice() {
        const users = this.state.value.users.filter(user => user.task === null);
        return users;
      },
      facility() {
        return this.state.value.facility;
      },
    },
    beforeMount() {
      this.isPolling = true;
      this.pollTask();
    },
    methods: {
      fullName(task_id) {
        const user = this.state.value.users.filter(u => u.task == task_id)[0];
        this.user = user;
        return user.full_name;
      },
      pollTask() {
        SetupTasksResource.fetchCollection({ force: true }).then(tasks => {
          if (tasks.length > 0) {
            this.loadingTask = {
              ...tasks[0],
              facility_name: this.facility.name,
              full_name: this.fullName(tasks[0].id),
              device_id: this.state.value.device.id,
            };
            if (this.loadingTask.status === TaskStatuses.COMPLETED) this.finishedTask();
          } else this.isPolling = false;
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollTask();
          }, 500);
        }
      },
      cancelTask() {
        return SetupTasksResource.canceltask(this.loadingTask.id);
      },
      retryImport() {
        this.isPolling = false;
        this.clearTasks().then(() => {
          this.lodService.send('BACK');
        });
      },
      clearTasks() {
        const task_id = this.loadingTask.id;
        this.state.value.users.forEach(function(u) {
          if (u.task == task_id) u.task = null;
        });
        return SetupTasksResource.cleartasks();
      },
      finishedTask() {
        this.isPolling = false;
        this.clearTasks();
        if (this.state.value.users.length === 1) {
          SessionResource.saveModel({
            data: {
              username: this.user.username,
              password: this.user.password,
              facility: this.facility.id,
            },
          });
        }
      },
      loginFirstUser() {
        this.welcomeModal = false;
        const content_url = urls['kolibri:kolibri.plugins.device:device_management']();
        redirectBrowser(content_url);
      },
    },
    $trs: {
      loadingUserTitle: {
        message: 'Loading user',
        context: 'Page title',
      },
      importAnother: {
        message: 'Import another user',
        context: 'give a chance to import more users',
      },
      onThisDevice: {
        message: 'On this device',
        context: 'To show the list of users on this device',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .another-user {
    padding-left: 20px;
  }
  .this-device {
    font-weight: bold;
  }

</style>
