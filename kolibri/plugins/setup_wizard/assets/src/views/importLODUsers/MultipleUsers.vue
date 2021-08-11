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
          :selectedStyle="importedStyle"
        >
          <template #action="userRow">
            <KButton
              v-if="isNotImported(userRow.user)"
              :text="coreString('importAction')"
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
      <KGrid>
        <KGridItem :layout="{ alignment: 'right' }">
          <KButton
            primary
            :text="coreString('finishAction')"
            @click="welcomeModal = true"
          />
        </KGridItem>
      </KGrid>
    </template>
    <WelcomeModal
      v-if="welcomeModal"
      :importedFacility="facility"
      :isLOD="true"
      @submit="redirectToChannels"
    />
  </OnboardingForm>

</template>


<script>

  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import UserTable from '../../../../../facility/assets/src/views/UserTable.vue';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import WelcomeModal from '../../../../../device/assets/src/views/WelcomeModal.vue';
  import { SetupSoUDTasksResource } from '../../api';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'MultipleUsers',
    components: {
      OnboardingForm,
      PaginatedListContainer,
      UserTable,
      WelcomeModal,
    },
    mixins: [commonCoreStrings, commonSyncElements],

    data() {
      return {
        welcomeModal: false,
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
      importedStyle() {
        return 'color:#CCCCCC;';
      },
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
      redirectToChannels() {
        window.sessionStorage.setItem(welcomeDimissalKey, true);
        this.welcomeModal = false;
        redirectBrowser();
      },
    },
    $trs: {
      commaSeparatedPair: '{first}, {second}',
      imported: {
        message: 'Imported',
        context:
          'Descriptive text appearing to indicate an user has already been imported into the facility',
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
