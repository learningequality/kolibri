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
          @click="redirectToChannels"
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
  </OnboardingForm>

</template>


<script>

  import urls from 'kolibri.urls';
  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import { SessionResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import FacilityTaskPanel from '../../../../../device/assets/src/views/FacilitiesPage/FacilityTaskPanel.vue';
  import { TaskStatuses } from '../../../../../device/assets/src/constants.js';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import { SetupSoUDTasksResource } from '../../api';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      return {
        loadingTask: this.state.value.task,
        isPolling: false,
        user: null,
      };
    },
    inject: ['lodService', 'state'],
    computed: {
      usersDevice() {
        const users = this.state.value.users.filter(u => u.task === null);
        return users;
      },
      loadingTaskID() {
        return this.state.value.task.id;
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
      userForTask() {
        return this.state.value.users.filter(u => u.task == this.loadingTaskID)[0];
      },
      pollTask() {
        SetupSoUDTasksResource.fetchCollection({ force: true }).then(tasks => {
          const soudTasks = tasks.filter(t => t.id == this.loadingTaskID);
          if (soudTasks.length > 0) {
            if (this.user === null) this.user = this.userForTask();
            this.loadingTask = {
              ...soudTasks[0],
              facility_name: this.loadingTask.facility_name,
              full_name: this.loadingTask.full_name,
              device_id: this.loadingTask.device_id,
            };
            if (this.loadingTask.status === TaskStatuses.COMPLETED) this.finishedTask();
            if (this.loadingTask.status === TaskStatuses.FAILED) {
              this.state.value.users.pop();
              this.isPolling = false;
            }
          } else this.isPolling = false;
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollTask();
          }, 500);
        }
      },
      cancelTask() {
        return SetupSoUDTasksResource.canceltask(this.loadingTask.id);
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
        return SetupSoUDTasksResource.cleartasks();
      },
      finishedTask() {
        this.isPolling = false;
        this.clearTasks();
        // after importing the first user, let's sign him in to continue:
        if (this.state.value.users.length === 1 && this.user.password) {
          SessionResource.saveModel({
            data: {
              username: this.user.username,
              password: this.user.password,
              facility: this.facility.id,
            },
          });
        }
      },
      redirectToChannels() {
        window.sessionStorage.setItem(welcomeDimissalKey, false);
        const device_url = urls['kolibri:kolibri.plugins.device:device_management']();
        redirectBrowser(device_url);
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
