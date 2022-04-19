<template>

  <OnboardingForm
    :header="$tr('selectAUser')"
    :description="facilityDescription"
  >
    <p class="device-name">
      {{ deviceDescription }}
    </p>
    <PaginatedListContainer
      :items="learners"
      :filterPlaceholder="$tr('searchForUser')"
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
              v-if="isNotImported(userRow.user)"
              :text="coreString('importAction')"
              :disabled="lodService.state.matches('syncAdminUser')"
              appearance="flat-button"
              @click="confirmImport(userRow.user)"
            />
            <p v-else class="imported">
              {{ $tr('imported') }}
            </p>
          </template>
        </UserTable>
      </template>
    </PaginatedListContainer>
    <template #buttons>
      <div></div>
    </template>
  </OnboardingForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import UserTable from '../../../../../facility/assets/src/views/UserTable.vue';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import { SetupSoUDTasksResource } from '../../api';
  import { TaskStatuses, TaskTypes } from '../../../../../device/assets/src/constants.js';

  export default {
    name: 'MultipleUsers',
    components: {
      OnboardingForm,
      PaginatedListContainer,
      UserTable,
    },
    mixins: [commonCoreStrings, commonSyncElements],

    data() {
      return {
        isPolling: false,
      };
    },
    inject: ['lodService', 'state'],
    computed: {
      learners() {
        return this.state.value.remoteStudents;
      },
      usersID() {
        return this.state.value.users.map(user => user.id);
      },
      device() {
        return this.state.value.device;
      },
      facility() {
        return this.state.value.facility;
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
    },
    beforeMount() {
      this.isPolling = true;
      this.pollAdminSyncTask();
    },
    methods: {
      confirmImport(learner) {
        const task_name = 'kolibri.plugins.setup_wizard.tasks.startprovisionsoud';
        const params = {
          baseurl: this.device.baseurl,
          username: this.facility.adminUser,
          password: this.facility.adminPassword,
          user_id: learner.id,
          facility_id: this.facility.id,
          device_name: this.device.name,
        };
        SetupSoUDTasksResource.createTask(task_name, params)
          .then(task => {
            task['device_id'] = this.device.id;
            task['facility_name'] = this.facility.name;
            this.lodService.send({
              type: 'CONTINUE',
              value: {
                username: learner.username,
                full_name: learner.full_name,
                id: learner.id,
                task: task,
              },
            });
          })
          .catch(error => {
            this.$store.dispatch('showError', error);
          });
      },
      isNotImported(learner) {
        const user = this.state.value.users.filter(u => u.username === learner.username);
        return user.length === 0;
      },

      pollAdminSyncTask() {
        SetupSoUDTasksResource.fetchCollection({ force: true }).then(tasks => {
          const soudTasks = tasks.filter(t => t.type === TaskTypes.SYNCLOD);
          if (soudTasks.length > 0) {
            this.loadingTask = {
              ...soudTasks[0],
            };
            if (this.loadingTask.status === TaskStatuses.COMPLETED) {
              // after importing the admin, let's sign him in to continue:
              this.$store
                .dispatch('logIntoSyncedFacility', {
                  username: this.facility.adminUser,
                  password: this.facility.adminPassword,
                  facility: this.facility.id,
                })
                .then(() => {
                  this.isPolling = false;
                  this.lodService.send('CONTINUE');
                  SetupSoUDTasksResource.cleartasks();
                });
            }
          }
          if (tasks.length == 0) this.isPolling = false;
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollAdminSyncTask();
          }, 500);
        }
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
      searchForUser: {
        message: 'Search for a user',
        context: 'Descriptive text which appears in the search field on the Facility > Users page.',
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
