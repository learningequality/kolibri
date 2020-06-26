<template>

  <KPageContainer>

    <h1>{{ $tr('syncData') }}</h1>
    <p>{{ $tr('access') }}</p>
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
                :disabled="facilityTaskId !== '' || !theFacility.dataset.registered"
                @click="sync()"
              />
            </KButtonGroup>
          </td>
        </tr>
      </tbody>
    </CoreTable>

    <PrivacyModal
      v-if="modalShown === Modals.PRIVACY"
      @cancel="displayModal(null)"
    />

    <RegisterFacilityModal
      v-if="modalShown === Modals.REGISTER_FACILITY"
      @success="handleValidateSuccess"
      @cancel="displayModal(null)"
    />
    <ConfirmationRegisterModal
      v-if="modalShown === Modals.CONFIRMATION_REGISTER"
      :targetFacility="theFacility"
      :projectName="projectName"
      :token="token"
      @success="handleConfirmationSuccess"
      @cancel="displayModal(null)"
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
  } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { Modals } from '../../../constants';
  import PrivacyModal from './PrivacyModal';

  export default {
    name: 'SyncInterface',
    components: {
      CoreTable,
      PrivacyModal,
      FacilityNameAndSyncStatus,
      RegisterFacilityModal,
      ConfirmationRegisterModal,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        projectName: '',
        token: '',
        modalShown: null,
      };
    },
    computed: {
      ...mapState('manageCSV', ['facilityTaskId']),
      Modals: () => Modals,
      theFacility() {
        return find(this.$store.state.manageCSV.facilities, {
          id: this.$store.getters.activeFacilityId,
        });
      },
    },
    methods: {
      displayModal(modal) {
        this.modalShown = modal;
      },
      register() {
        this.modalShown = Modals.REGISTER_FACILITY;
      },
      sync() {
        this.startKdpSyncTask(this.theFacility.id).then(task => {
          this.$store.commit('manageCSV/START_FACILITY_SYNC', task);
        });
      },
      handleValidateSuccess({ name, token }) {
        this.projectName = name;
        this.token = token;
        this.modalShown = Modals.CONFIRMATION_REGISTER;
      },
      handleConfirmationSuccess(payload) {
        this.$store.commit('manageCSV/SET_REGISTERED', payload);
        this.modalShown = null;
      },
    },
    $trs: {
      syncData: 'Sync facility data',
      access:
        'This is an experimental feature. You can use it if you have access to the Kolibri Data Portal.',
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
