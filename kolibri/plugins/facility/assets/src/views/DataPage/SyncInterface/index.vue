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
            <FacilityNameAndSyncStatus :facility="theFacility" />
          </td>
          <td class="button-col">
            <KButtonGroup style="margin-top: 8px; overflow: visible">
              <KButton
                appearance="raised-button"
                :text="$tr('register')"
                :disabled="facilityTaskId !== ''"
                @click="register()"
              />
              <KButton
                appearance="raised-button"
                :text="$tr('sync')"
                :disabled="facilityTaskId !== ''"
                @click="showFacilitySyncModal"
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

  import find from 'lodash/find';
  import { mapState } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {
    FacilityNameAndSyncStatus,
    ConfirmationRegisterModal,
    RegisterFacilityModal,
    SyncFacilityModalGroup,
  } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
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
        modalShown: null,
        Modals,
      };
    },
    computed: {
      ...mapState('manageCSV', ['facilityTaskId']),
      theFacility() {
        return find(this.$store.state.manageCSV.facilities, {
          id: this.$store.getters.activeFacilityId,
        });
      },
    },
    methods: {
      closeModal() {
        this.modalShown = null;
      },
      displayModal(modal) {
        this.modalShown = modal;
      },
      register() {
        this.modalShown = Modals.REGISTER_FACILITY;
      },
      showFacilitySyncModal() {
        this.modalShown = Modals.SYNC_FACILITY;
      },
      handleValidateSuccess({ name, token }) {
        this.projectName = name;
        this.token = token;
        this.modalShown = Modals.CONFIRMATION_REGISTER;
      },
      handleConfirmationSuccess(payload) {
        this.$store.commit('manageCSV/SET_REGISTERED', payload);
        this.closeModal();
      },
      handleSyncFacilitySuccess(taskId) {
        this.$store.commit('manageCSV/START_FACILITY_SYNC', {
          facility: this.$store.getters.activeFacilityId,
          id: taskId,
        });
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
