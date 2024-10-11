<template>

  <OnboardingStepBase
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    :showBackArrow="true"
    :eventOnGoBack="backArrowEvent"
    :title="$tr('selectAUser')"
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
              @click="startImport(userRow.user)"
            />
            <KCircularLoader
              v-else-if="isImporting(userRow.user)"
              :size="24"
              style="margin: 4px auto 0"
            />
            <p
              v-else
              class="imported"
            >
              {{ $tr('imported') }}
            </p>
          </template>
        </UserTable>
      </template>
    </PaginatedListContainer>
    <template #buttons>
      <div></div>
    </template>
  </OnboardingStepBase>

</template>


<script>

  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { DemographicConstants } from 'kolibri/constants';
  import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
  import UserTable from 'kolibri-common/components/UserTable';
  import { FooterMessageTypes, SoudQueue } from '../constants';
  import OnboardingStepBase from './OnboardingStepBase';

  /** Workflow
  - wizardService holds successfully imported learners and a list of all possible learners
  - This component will maintain a list of users currently being imported by polling the
    SoudQueue task queue - we use this list of users to change their "import" button to a
    circular loader; then when they are done being imported, we add them to the final state
    which allows us to identify them as being "imported" in place of the "import" button
  - If the admin goes back from here they go to a loading page which will ping the same Queue
    and offer them to import another user once all SoudQueue tasks are COMPLETE
*/
  export default {
    name: 'ImportMultipleUsers',
    components: {
      OnboardingStepBase,
      PaginatedListContainer,
      UserTable,
    },
    mixins: [commonCoreStrings, commonSyncElements],

    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_INDIVIDUALS;
      return {
        footerMessageType,
        isPolling: false,
        // array of user/learner ids
        learnersBeingImported: [],
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
    },
    methods: {
      importedLearners() {
        return this.wizardService.state.context.importedUsers;
      },
      pollImportTask() {
        TaskResource.list({ queue: SoudQueue }).then(tasks => {
          if (tasks.length) {
            tasks.forEach(task => {
              if (task.status === TaskStatuses.COMPLETED) {
                // Remove completed user id from 'being imported'
                const taskUserId = task.extra_metadata.user_id;
                this.learnersBeingImported = this.learnersBeingImported.filter(
                  id => id != taskUserId,
                );

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
              }
            });
          }
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollImportTask();
          }, 2000);
        }
      },
      startImport(learner) {
        // Push the learner into being imported, we'll remove it if we get an error later on
        this.learnersBeingImported.push(learner.id);

        const task_name = 'kolibri.core.auth.tasks.peeruserimport';
        const params = {
          type: task_name,
          ...this.wizardService.state.context.lodAdmin,
          facility: this.facility.id,
          facility_name: this.facility.name,
          device_id: this.device.id,
          user_id: learner.id,
          using_admin: true,
        };
        if (!this.wizardService.state.context.firstImportedLodUser) {
          this.wizardService.send({
            type: 'SET_FIRST_LOD',
            value: { username: learner.username, password: DemographicConstants.NOT_SPECIFIED },
          });
        }
        TaskResource.startTask(params).catch(() => {
          this.learnersBeingImported = this.learnersBeingImported.filter(id => id != learner.id);
        });
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
      imported: {
        message: 'Imported',
        context: 'Label indicating that a learner user account has already been imported.',
      },
      selectAUser: {
        message: 'Select a user',
        context:
          'Descriptive text which appears in the title of this page to select users to sync.',
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
