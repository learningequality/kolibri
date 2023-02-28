<template>

  <OnboardingStepBase
    :title="header"
    :navDisabled="![TaskStatuses.COMPLETED, TaskStatuses.FAILED].includes(loadingTask.status)"
    @continue="$emit('click_next')"
  >
    <FacilityTaskPanel
      v-if="loadingTask.status"
      :task="loadingTask"
      @cancel="cancelTask"
    />
    <template #buttons>
      <KButton
        v-if="loadingTask.status === 'COMPLETED'"
        primary
        :text="coreString('continueAction')"
        @click="handleClickContinue"
      />
      <template v-else-if="loadingTask.status === 'FAILED'">
        <KButton
          :text="coreString('startOverAction')"
          appearance="flat-button"
          @click="startOver"
        />
        <KButton
          primary
          :text="coreString('retryAction')"
          @click="retryImport"
        />
      </template>
      <span v-else></span>
    </template>
    <KButton
      v-if="loadingTask.status === 'COMPLETED' && isSoud"
      appearance="basic-link"
      :text="$tr('importAnother')"
      @click="importAnother"
    />
  </OnboardingStepBase>

</template>


<script>

  import { FacilityTaskPanel } from 'kolibri.coreVue.componentSets.sync';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';
  import { DeviceTypePresets, SoudQueue } from '../constants';
  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingStepBase,
    },
    inject: ['wizardService'],
    mixins: [commonCoreStrings],
    data() {
      return {
        loadingTask: { status: '' },
        isPolling: false,
        TaskStatuses,
      };
    },
    computed: {
      isSoud() {
        return this.queue === SoudQueue;
      },
      queue() {
        return this.wizardService.state.context.fullOrLOD === DeviceTypePresets.LOD
          ? SoudQueue
          : 'facility_task';
      },
      facility() {
        return this.wizardService.state.context.selectedFacility;
      },
      header() {
        return this.isSoud ? this.$tr('loadUserTitle') : this.$tr('importFacilityTitle');
      },
      facilityName() {
        return this.facility.name;
      },
    },
    beforeMount() {
      this.clearTasks();
      this.isPolling = true;
      this.pollTask();
    },
    methods: {
      importAnother() {
        this.isPolling = false;
        this.wizardService.send('IMPORT_ANOTHER');
      },
      setSuperAdminIfNotSet(username) {
        if (!this.wizardService.state.context.importedUsers.length) {
          // This is the first imported user and will be made into the superuser
          this.wizardService.send({
            type: 'SET_SUPERADMIN',
            // Note we include something in the `password` field here to pass serialization
            // In this particular case, we will find the imported user with their username
            // And they will become the device's super admin
            value: { username: username, password: 'Not The Real Password' },
          });
        }
      },
      pollTask() {
        TaskResource.list({ queue: this.queue }).then(tasks => {
          if (tasks.length) {
            this.loadingTask = {
              ...tasks[0],
              extra_metadata: {
                facility_name: this.facilityName,
                ...tasks[0].extra_metadata,
              },
            };
            if (this.loadingTask.status === TaskStatuses.COMPLETED) {
              const taskUsername = this.loadingTask.extra_metadata.username;
              this.setSuperAdminIfNotSet(taskUsername);

              // Update the wizard context to know this user has been imported
              this.wizardService.send({ type: 'ADD_IMPORTED_USER', value: taskUsername });
            }
          } else {
            this.isPolling = false;
            // If we don't have a status on the loading task, we got here without there being
            // any tasks active; we can just continue along
            if (!this.loadingTask.status) {
              this.handleClickContinue();
            }
          }
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollTask();
          }, 2000);
        }
      },
      retryImport() {
        TaskResource.restart(this.loadingTask.id).catch(error => {
          this.$store.dispatch('handleApiError', error);
        });
      },
      cancelTask() {
        return TaskResource.cancel(this.loadingTask.id);
      },
      startOver() {
        this.isPolling = false;
        this.clearTasks().then(() => {
          this.$emit('start_over');
        });
      },
      clearTasks() {
        return TaskResource.clearAll(this.queue);
      },
      handleClickContinue() {
        this.isPolling = false;
        this.clearTasks();
        this.wizardService.send(this.isSoud ? 'FINISH' : 'CONTINUE');
      },
    },
    $trs: {
      importAnother: {
        message: 'Import another user',
        context: 'Link to restart the import step for another user. ',
      },
      loadUserTitle: {
        message: 'Load user account',
        context: 'Title of a page where user is waiting for a user to be imported',
      },
      importFacilityTitle: {
        message: 'Import learning facility',
        context:
          'Title of a page where user will sign in to a remote facility to begin the syncing process',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
