<template>

  <KPageContainer>

    <h1>{{ $tr('syncData') }}</h1>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('learnMore')"
        @click="displayModal(Modals.PRIVACY)"
      />
    </p>

    <CoreTable>
      <template #headers>
        <th>{{ $tr('facility') }}</th>
      </template>
      <template #tbody>
        <tbody>
          <tr v-if="theFacility">
            <td>
              <FacilityNameAndSyncStatus
                :facility="theFacility"
                :isSyncing="isSyncing"
                :syncHasFailed="syncHasFailed"
              />
            </td>
            <td class="button-col">
              <KButtonGroup style="margin-top: 8px; overflow: visible">
                <KButton
                  appearance="raised-button"
                  :text="$tr('register')"
                  :disabled="Boolean(syncTaskId) || theFacility.dataset.registered"
                  @click="displayModal(Modals.REGISTER_FACILITY)"
                />
                <KButton
                  appearance="raised-button"
                  :text="$tr('sync')"
                  :disabled="Boolean(syncTaskId)"
                  @click="displayModal(Modals.SYNC_FACILITY)"
                />
              </KButtonGroup>
            </td>
          </tr>
        </tbody>
      </template>
    </CoreTable>

    <PrivacyModal
      v-if="modalShown === Modals.PRIVACY"
      @cancel="closeModal"
    />

    <RegisterFacilityModal
      v-if="modalShown === Modals.REGISTER_FACILITY"
      @success="handleValidateSuccess"
      @cancel="closeModal"
    />
    <ConfirmationRegisterModal
      v-if="modalShown === Modals.CONFIRMATION_REGISTER"
      :targetFacility="theFacility"
      :projectName="kdpProject.name"
      :token="kdpProject.token"
      @success="handleConfirmationSuccess"
      @cancel="closeModal"
    />

    <SyncFacilityModalGroup
      v-if="modalShown === Modals.SYNC_FACILITY"
      :facilityForSync="theFacility"
      @close="closeModal"
      @success="handleSyncFacilitySuccess"
      @failure="handleSyncFacilityFailure"
    />

  </KPageContainer>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {
    FacilityNameAndSyncStatus,
    ConfirmationRegisterModal,
    RegisterFacilityModal,
    SyncFacilityModalGroup,
  } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { FacilityTaskResource, FacilityResource } from 'kolibri.resources';
  import { TaskStatuses } from '../../../constants';
  import PrivacyModal from './PrivacyModal';

  const Modals = Object.freeze({
    SYNC_FACILITY: 'SYNC_FACILITY',
    CONFIRMATION_REGISTER: 'CONFIRMATION_REGISTER',
    REGISTER_FACILITY: 'REGISTER_FACILITY',
    PRIVACY: 'PRIVACY',
  });

  export default {
    name: 'SyncInterface',
    components: {
      CoreTable,
      PrivacyModal,
      FacilityNameAndSyncStatus,
      RegisterFacilityModal,
      ConfirmationRegisterModal,
      SyncFacilityModalGroup,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        theFacility: null,
        kdpProject: null, // { name, token }
        modalShown: null,
        syncTaskId: '',
        isSyncing: false,
        syncHasFailed: false,
        Modals,
      };
    },
    beforeMount() {
      this.fetchFacility();
    },
    beforeDestroy() {
      this.syncTaskId = '';
    },
    methods: {
      fetchFacility() {
        FacilityResource.fetchModel({ id: this.$store.getters.activeFacilityId, force: true }).then(
          facility => {
            this.theFacility = { ...facility };
          }
        );
      },
      closeModal() {
        this.modalShown = null;
      },
      displayModal(modal) {
        this.modalShown = modal;
      },
      pollSyncTask() {
        // Like facilityTaskQueue, just keep polling until component is destroyed
        FacilityTaskResource.fetchModel({ id: this.syncTaskId, force: true }).then(task => {
          if (task.clearable) {
            this.isSyncing = false;
            this.syncTaskId = '';
            FacilityTaskResource.deleteFinishedTask(this.syncTaskId);
            if (task.status === TaskStatuses.FAILED) {
              this.syncHasFailed = true;
            } else if (task.status === TaskStatuses.COMPLETED) {
              this.fetchFacility();
            }
          } else if (this.syncTaskId) {
            setTimeout(() => {
              this.pollSyncTask();
            }, 2000);
          }
        });
      },
      handleValidateSuccess({ name, token }) {
        this.kdpProject = { name, token };
        this.displayModal(Modals.CONFIRMATION_REGISTER);
      },
      handleConfirmationSuccess(payload) {
        this.$store.commit('manageCSV/SET_REGISTERED', payload);
        this.closeModal();
      },
      handleSyncFacilitySuccess(taskId) {
        this.isSyncing = true;
        this.syncTaskId = taskId;
        this.pollSyncTask();
        this.closeModal();
      },
      handleSyncFacilityFailure() {
        this.syncHasFailed = true;
        this.closeModal();
      },
    },
    $trs: {
      syncData: {
        message: 'Sync facility data',
        context:
          'Option to sync the current facility data with the Learning Equality Kolibri Data Portal in the cloud.',
      },
      learnMore: {
        message: 'Usage and privacy',
        context:
          "A link to 'Usage and privacy' information which pops up in a window when clicked.",
      },
      facility: {
        message: 'Facility',
        context: "Refers to the facility name on the 'Sync Facility Data' window.",
      },
      register: {
        message: 'Register',
        context: 'Describes the button to register a new facility.',
      },
      sync: {
        message: 'Sync',
        context:
          "Describes the 'sync' button which is used to synchronize data from a facility with the project on the Kolibri Data Portal.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  /* derived from .core-table-button-col */
  .button-col {
    padding: 4px;
    padding-top: 8px;
    text-align: right;
  }

  .name {
    display: inline-block;
    margin-right: 8px;
  }

  .loader {
    top: 3px;
    display: inline-block;
    margin-right: 8px;
  }

</style>
