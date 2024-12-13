<template>

  <OnboardingStepBase
    :title="header"
    :navDisabled="runningTasks.length > 0"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    @continue="$emit('click_next')"
  >
    <FacilityTaskPanel
      v-if="loadingTask.status"
      :task="loadingTask"
      @cancel="cancelTask"
    />
    <KCircularLoader v-else />
    <template #buttons>
      <KButton
        v-if="loadingTask.status === 'COMPLETED'"
        primary
        :text="nextButtonLabel"
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

  import FacilityTaskPanel from 'kolibri-common/components/syncComponentSet/FacilityTaskPanel';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
  import { DeviceTypePresets, LodTypePresets, SoudQueue, FooterMessageTypes } from '../constants';
  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingStepBase,
    },
    inject: ['wizardService'],
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      footerMessageType: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        allTasks: [],
        isPolling: false,
        lastLoadingTask: {
          /* eslint-disable vue/no-unused-properties */
          status: null,
          /* eslint-enable */
        },
      };
    },
    computed: {
      nextButtonLabel() {
        return this.step === this.steps && this.step !== null
          ? this.coreString('finishAction') // We're on the last step since step === steps
          : this.coreString('continueAction');
      },
      // If there is only one facility we skipped a step, so we're on step 1
      step() {
        if (this.footerMessageType === FooterMessageTypes.IMPORT_FACILITY) {
          return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 2 : 3;
        }
        if (
          this.footerMessageType === FooterMessageTypes.IMPORT_INDIVIDUALS ||
          this.footerMessageType === FooterMessageTypes.JOIN_FACILITY
        ) {
          return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 2 : 3;
        }
        return null;
      },
      // If there is only one facility we skipped a step, so we only have 4 steps
      steps() {
        if (this.footerMessageType === FooterMessageTypes.IMPORT_FACILITY) {
          return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 4 : 5;
        }
        if (
          this.footerMessageType === FooterMessageTypes.IMPORT_INDIVIDUALS ||
          this.footerMessageType === FooterMessageTypes.JOIN_FACILITY
        ) {
          return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 2 : 3;
        }
        return null;
      },
      doneTaskStatuses() {
        return [TaskStatuses.COMPLETED, TaskStatuses.FAILED];
      },
      completedTasks() {
        return this.allTasks.filter(t => t.status === TaskStatuses.COMPLETED);
      },
      runningTasks() {
        return this.allTasks.filter(t => !this.doneTaskStatuses.includes(t.status));
      },
      loadingTask() {
        return this.runningTasks.length ? this.runningTasks[0] : this.lastLoadingTask;
      },
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
      header() {
        return this.isSoud
          ? this.$tr('loadUserTitle')
          : this.getCommonSyncString('importFacilityAction');
      },
    },
    beforeMount() {
      this.isPolling = true;
      this.pollTask();
    },
    methods: {
      importAnother() {
        this.isPolling = false;
        this.wizardService.send('IMPORT_ANOTHER');
      },
      pushCompletedToWizardMachine() {
        this.completedTasks.forEach(task => {
          if (!this.wizardService.state.context.importedUsers.includes(task.username)) {
            this.wizardService.send({
              type: 'ADD_IMPORTED_USER',
              value: task.extra_metadata.username,
            });
          }
        });
      },
      pollTask() {
        /**
       - Save tasks returned to this.loadingTasks
       - Clear completed
       **/
        TaskResource.list({ queue: this.queue })
          .then(tasks => {
            if (!tasks.length) {
              // If we have no tasks (ie, they've been cleared and the page loaded here)
              // we can just move along to the next step
              this.handleClickContinue();
            }
            if (this.loadingTask) {
              // We cache the last task so when all are complete we can show its status
              this.lastLoadingTask = this.loadingTask;
            }
            this.allTasks = tasks;
            this.pushCompletedToWizardMachine(); // Update state machine

            // No more tasks are yet to be completed
            if (this.runningTasks.length === 0) {
              // In case we got here and every task was already done, set the lastLoadingTask
              // to the last COMPLETED task -- or the first of all of the tasks
              this.lastLoadingTask = this.completedTasks.length
                ? this.completedTasks[this.completedTasks.length - 1]
                : this.allTasks[0];
              this.isPolling = false;
            }
            // New timeout to poll again if we should
            if (this.isPolling) {
              setTimeout(() => {
                this.pollTask();
              }, 2000);
            }
          })
          .catch(error => {
            if (error.status == 500) {
              if (this.isPolling) {
                setTimeout(() => {
                  this.pollTask();
                }, 2000);
              }
            }
          });
      },
      retryImport() {
        TaskResource.restart(this.loadingTask.id).catch(error => {
          this.$store.dispatch('handleApiError', { error });
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
        message: 'Import another user account',
        context: 'Link to restart the import step for another user. ',
      },
      loadUserTitle: {
        message: 'Load user account',
        context: 'Title of a page where user is waiting for a user to be imported',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
