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
      <thead slot="thead">
        <tr>
          <th>{{ $tr('facility') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
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
      :projectName="projectName"
      :token="token"
      @success="handleConfirmationSuccess"
      @cancel="closeModal"
    />

    <SyncFacilityModalGroup
      v-if="modalShown === Modals.SYNC_FACILITY"
      :facilityForSync="theFacility"
      @close="closeModal"
      @success="handleSyncFacilitySuccess"
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
        projectName: '',
        token: '',
        theFacility: null,
        modalShown: null,
        syncTaskId: '',
        isSyncing: false,
        syncHasFailed: false,
        Modals,
      };
    },
    computed: {},
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
          if (task.status === 'COMPLETED') {
            this.isSyncing = false;
            FacilityTaskResource.deleteFinishedTask(this.syncTaskId);
            this.syncTaskId = '';
            this.fetchFacility();
          } else if (task.status === 'FAILED') {
            this.isSyncing = false;
            this.syncHasFailed = true;
            this.syncTaskId = '';
            FacilityTaskResource.deleteFinishedTask(this.syncTaskId);
          } else if (this.syncTaskId) {
            setTimeout(() => {
              this.pollSyncTask();
            }, 2000);
          }
        });
      },
      handleValidateSuccess({ name, token }) {
        this.projectName = name;
        this.token = token;
        this.displayModal(Modals.CONFIRMATION_REGISTER);
      },
      handleConfirmationSuccess(payload) {
        this.$store.commit('manageCSV/SET_REGISTERED', payload);
        this.closeModal();
      },
      handleSyncFacilitySuccess(taskId) {
        this.syncTaskId = taskId;
        this.isSyncing = true;
        this.pollSyncTask();
        this.closeModal();
      },
    },
    $trs: {
      syncData: 'Sync facility data',
      learnMore: 'Usage and privacy',
      facility: 'Facility',
      register: 'Register',
      sync: 'Sync',
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
