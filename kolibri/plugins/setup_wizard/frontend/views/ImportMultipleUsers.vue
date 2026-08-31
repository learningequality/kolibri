<template>

  <OnboardingStepBase
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    :showBackArrow="true"
    :backArrowDisabled="learnersBeingImported.length > 0"
    :eventOnGoBack="backArrowEvent"
    :title="selectAUser$()"
    :description="facilityDescription"
  >
    <p class="device-name">
      {{ deviceDescription }}
    </p>
    <div v-if="noUsersImported">
      {{ getCommonSyncString('warningFirstImportedIsSuperuser') }}
    </div>
    <PaginatedListContainer
      :items="learners"
      :filterPlaceholder="coreString('searchForUser')"
    >
      <template #default="{ items }">
        <UserTable
          :users="items"
          :selectable="false"
          :showDemographicInfo="false"
          :value="usersID"
          :selectedStyle="`color:${$themeTokens.textDisabled}`"
        >
          <template #action="userRow">
            <KButton
              v-if="!isImported(userRow.user) && !isImporting(userRow.user)"
              :text="coreString('importAction')"
              appearance="flat-button"
              @click="onImportClick(userRow.user)"
            />
            <KCircularLoader
              v-else-if="isImporting(userRow.user)"
              disableDefaultTransition
              :size="24"
              style="margin: 4px auto 0"
            />
            <p
              v-else
              class="imported"
            >
              {{ importedLabel$() }}
            </p>
          </template>
        </UserTable>
      </template>
    </PaginatedListContainer>
    <template #buttons>
      <div></div>
    </template>
    <GlobalSnackbar />
  </OnboardingStepBase>

</template>


<script>

  import { onMounted, onUnmounted } from 'vue';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';
  import { DemographicConstants } from 'kolibri/constants';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import UserTable from 'kolibri-common/components/UserTable';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import GlobalSnackbar from 'kolibri/components/GlobalSnackbar';
  import { FooterMessageTypes, SoudQueue } from '../constants';
  import { useSemaphore } from '../composables/useSemaphore';
  import OnboardingStepBase from './OnboardingStepBase';

  // Grace period to consider between when a task has finished being created and
  // when it is finally in QUEUED status in the task poll.
  const TASK_ENQUEUE_TIMEOUT = 5000;

  /**
     Workflow
     - wizardService holds successfully imported learners and a list of all possible learners
     - This component will maintain a list of users currently being imported by polling the
     SoudQueue task queue - we use this list of users to change their "import" button to a
     circular loader; then when they are done being imported, we add them to the final state
     which allows us to identify them as being "imported" in place of the "import" button
     - If the admin goes back from here they go to a loading page which will ping the same Queue
     and offer them to import another user once all SoudQueue tasks are COMPLETE.
   */
  export default {
    name: 'ImportMultipleUsers',
    components: {
      OnboardingStepBase,
      PaginatedListContainer,
      UserTable,
      GlobalSnackbar,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    setup() {
      const { selectAUser$, importedLabel$, importUserError$ } = lodUsersManagementStrings;
      const { createSnackbar } = useSnackbar();
      const { closeConfirmationTitle$ } = coreStrings;
      const { enqueue, pendingCount } = useSemaphore();

      const beforeUnload = event => {
        if (pendingCount.value > 0) {
          if (!window.confirm(closeConfirmationTitle$())) {
            event.preventDefault();
          }
        }
      };
      onMounted(() => {
        window.addEventListener('beforeunload', beforeUnload);
      });
      onUnmounted(() => {
        window.removeEventListener('beforeunload', beforeUnload);
      });

      return {
        enqueue,
        createSnackbar,
        selectAUser$,
        importedLabel$,
        importUserError$,
      };
    },
    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_INDIVIDUALS;
      return {
        footerMessageType,
        isPolling: false,
        // array of user/learner ids
        learnersBeingImported: [],
        // Array of learner ids whose import tasks are being created
        learnersTaskCreationLoading: [],
      };
    },
    inject: ['wizardService'],
    computed: {
      noUsersImported() {
        // User can only go back from here if they've not yet imported any users, otherwise
        // they've gone beyond the point of no return.
        return this.wizardService.state.context.importedUsers.length == 0;
      },
      step() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 1 : 2;
      },
      // If there is only one facility we skipped a step, so we only have 4 steps
      steps() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 2 : 3;
      },
      learners() {
        return this.wizardService.state.context.remoteUsers;
      },
      usersID() {
        return this.learners.map(user => user.id);
      },
      device() {
        return this.wizardService.state.context.importDevice;
      },
      facility() {
        return this.wizardService.state.context.selectedFacility;
      },
      facilityDescription() {
        return this.formatNameAndId(this.facility.name, this.facility.id);
      },
      deviceDescription() {
        if (this.device.name) {
          return this.$tr('commaSeparatedPair', {
            first: this.formatNameAndId(this.device.name, this.device.id),
            second: this.device.baseurl,
          });
        }
        return '';
      },
      backArrowEvent() {
        return this.learnersBeingImported.length == 0
          ? { type: 'BACK' } // No tasks are running, go back to the auth screen
          : { type: 'LOADING' }; // There are users being loaded, go to Loading Tasks Page
      },
    },
    beforeMount() {
      this.isPolling = true;
      this.pollImportTask();
      this.learnersBeingImported = this.wizardService.state.context.usersBeingImported.map(
        u => u.id,
      );
    },
    methods: {
      importedLearners() {
        return this.wizardService.state.context.importedUsers;
      },
      removeUsersBeingImportedMissingOnTasks(tasks) {
        // If for some reason tasks were cleared from the queue and we didn't notice,
        // we need to make sure we clear out the 'being imported' list to avoid
        // blocking the UI indefinitely.
        // In the worst case scenario, an already imported user will show up as not imported,
        // but the admin can just re-import them again without harm.
        const taskUserIds = tasks.map(task => task.extra_metadata.user_id);
        const missingLearners = [];
        this.learnersBeingImported.forEach(id => {
          if (!taskUserIds.includes(id) && !this.learnersTaskCreationLoading.includes(id)) {
            this.wizardService.send({
              type: 'REMOVE_USER_BEING_IMPORTED',
              value: id,
            });
            missingLearners.push(id);
          }
        });
        if (missingLearners.length) {
          this.learnersBeingImported = this.learnersBeingImported.filter(
            id => !missingLearners.includes(id),
          );
          this.createSnackbar(this.importUserError$());
        }
      },
      pollImportTask() {
        TaskResource.list({ queue: SoudQueue }).then(tasks => {
          this.removeUsersBeingImportedMissingOnTasks(tasks);
          if (tasks.length) {
            let isFailingTasks = false;
            tasks.forEach(task => {
              if ([TaskStatuses.COMPLETED, TaskStatuses.FAILED].includes(task.status)) {
                // Remove completed/failed user id from 'being imported'
                const taskUserId = task.extra_metadata.user_id;
                this.learnersBeingImported = this.learnersBeingImported.filter(
                  id => id != taskUserId,
                );
                this.wizardService.send({
                  type: 'REMOVE_USER_BEING_IMPORTED',
                  value: taskUserId,
                });
              }
              if (task.status === TaskStatuses.COMPLETED) {
                // Update the wizard context to know this user has been imported - only if they
                // haven't already been added to the list (ie, imported by other means)
                const taskUsername = task.extra_metadata.username;
                if (!this.importedLearners().length) {
                  // This is the first imported user and will be made into the superuser
                  this.wizardService.send({
                    type: 'SET_SUPERADMIN',
                    // Note we include something in the `password` field here to pass serialization
                    // In this particular case, we will find the imported user with their username
                    // And they will become the device's super admin
                    value: { username: taskUsername, password: 'Not The Real Password' },
                  });
                }
                if (!this.importedLearners().includes(taskUsername)) {
                  this.wizardService.send({
                    type: 'ADD_IMPORTED_USER',
                    value: taskUsername,
                  });
                }
              } else if (task.status === TaskStatuses.FAILED) {
                isFailingTasks = true;
              }
            });
            if (isFailingTasks) {
              this.createSnackbar(this.importUserError$());
              TaskResource.clearAll(SoudQueue);
            }
          }
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollImportTask();
          }, 2000);
        }
      },
      async onImportClick(learner) {
        this.learnersBeingImported.push(learner.id);
        // Do not do the start import request directly, enqueue it to limit concurrency
        this.learnersTaskCreationLoading.push(learner.id);
        await this.enqueue(() => this.startImport(learner));

        setTimeout(() => {
          // When the import task creation is done, remove from loading state
          const index = this.learnersTaskCreationLoading.indexOf(learner.id);
          if (index > -1) {
            this.learnersTaskCreationLoading.splice(index, 1);
          }
        }, TASK_ENQUEUE_TIMEOUT);
      },
      async startImport(learner) {
        const task_name = TaskTypes.IMPORTLODUSER;
        const params = {
          type: task_name,
          ...this.wizardService.state.context.remoteAdmin,
          facility: this.facility.id,
          facility_name: this.facility.name,
          device_id: this.device.id,
          user_id: learner.id,
          using_admin: true,
          enqueue_args: {
            retry_interval: 5,
            max_retries: 5,
          },
        };
        if (!this.wizardService.state.context.firstImportedLodUser) {
          this.wizardService.send({
            type: 'SET_FIRST_LOD',
            value: { username: learner.username, password: DemographicConstants.NOT_SPECIFIED },
          });
        }
        try {
          const newTask = await TaskResource.startTask(params);
          this.wizardService.send({
            type: 'ADD_USER_BEING_IMPORTED',
            value: {
              id: learner.id,
              full_name: learner.full_name,
              username: learner.username,
              taskId: newTask.id,
            },
          });
        } catch (error) {
          this.createSnackbar(this.importUserError$());
          this.learnersBeingImported = this.learnersBeingImported.filter(id => id != learner.id);
        }
      },
      isImported(learner) {
        return this.importedLearners().find(u => u === learner.username);
      },
      isImporting(learner) {
        return this.learnersBeingImported.includes(learner.id);
      },
    },
    $trs: {
      commaSeparatedPair: {
        message: '{first}, {second}',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .device-name {
    margin: 0;
  }

  .imported {
    padding-top: 4px;
    padding-right: 16px;
    padding-bottom: 4px;
    margin: 0;
  }

</style>
