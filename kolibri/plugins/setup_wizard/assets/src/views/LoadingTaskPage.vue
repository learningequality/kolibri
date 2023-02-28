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
      v-if="loadingTask.status === 'COMPLETED' && isImportingSoud"
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
  import { DeviceTypePresets, LodTypePresets, SoudQueue } from '../constants';
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
        emptyPollResponseCount: 0,
        TaskStatuses,
      };
    },
    computed: {
      isSoud() {
        return this.queue === SoudQueue;
      },
      isImportingSoud() {
        return this.wizardService.state.context.lodImportOrJoin === LodTypePresets.IMPORT;
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
      setSuperAdminIfNotSet(_username) {
        // This is the first imported user and will be made into the superuser
        if (!this.wizardService.state.context.importedUsers.length) {
          // See if the user is in Vuex first -- use that if it's there.
          let { username, password } = this.$store.state.onboardingData.user;
          // Note we include something in the `password` field here to pass serialization
          // In this particular case, we will find the imported user with their username
          // And they will become the device's super admin
          username = username || _username;
          password = password || 'NOT_SPECIFIED';
          this.wizardService.send({
            type: 'SET_SUPERADMIN',
            value: { username, password },
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
            // If we don't have a status on the loading task, we got here without there being
            // any tasks active; we can just continue along
            if (!this.loadingTask.status) {
              this.emptyPollResponseCount += 1;
              if (this.emptyPollResponseCount >= 3) {
                this.isPolling = false;
                this.handleClickContinue(); // We've tried a few times, there is nothing queued
              }
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
          this.wizardService.send('START_OVER');
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
