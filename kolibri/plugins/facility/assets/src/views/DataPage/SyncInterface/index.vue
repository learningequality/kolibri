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
      <transition-group slot="tbody" tag="tbody" name="list">
        <tr v-for="facility in facilities" :key="facility.id">
          <td>
            <FacilityNameAndSyncStatus :facility="facility" />
          </td>
          <td class="button-col">
            <KButtonGroup>
              <KButton
                appearance="raised-button"
                :text="$tr('register')"
                :disabled="facilityTaskId !== ''"
                @click="register(facility)"
              />
              <KButton
                appearance="raised-button"
                :text="$tr('sync')"
                :disabled="facilityTaskId !== '' || !facility.dataset.registered"
                @click="sync(facility)"
              />
            </KButtonGroup>
          </td>
        </tr>
      </transition-group>
    </CoreTable>

    <PrivacyModal
      v-if="modalShown === Modals.PRIVACY"
      @cancel="displayModal(false)"
    />

    <RegisterFacilityModal
      v-if="modalShown === Modals.REGISTER_FACILITY"
      @cancel="displayModal(false)"
      @success="handleValidateSuccess"
    />
    <ConfirmationRegisterModal
      v-if="modalShown === Modals.CONFIRMATION_REGISTER"
      v-bind="{ projectName, targetFacility, token }"
      @cancel="displayModal(false)"
      @success="handleConfirmationSuccess"
    />

  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {
    FacilityNameAndSyncStatus,
    ConfirmationRegisterModal,
    RegisterFacilityModal,
  } from 'kolibri.coreVue.componentSets.sync';
  import { TaskResource } from 'kolibri.resources';
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
    computed: {
      ...mapState('manageSync', ['modalShown', 'projectName', 'targetFacility', 'token']),
      ...mapState('manageCSV', ['facilityTaskId']),
      Modals: () => Modals,
      facilities() {
        return this.$store.state.manageCSV.facilities.filter(
          ({ id }) => id === this.$store.getters.activeFacilityId
        );
      },
    },
    methods: {
      ...mapActions('manageSync', ['displayModal']),
      register(facility) {
        this.$store.commit('manageSync/SET_TARGET_FACILITY', facility);
        this.displayModal(Modals.REGISTER_FACILITY);
      },
      sync(facility) {
        TaskResource.dataportalsync(facility.id).then(response => {
          this.$store.commit('manageCSV/START_FACILITY_SYNC', response.entity);
        });
      },
      handleValidateSuccess(payload) {
        const { projectName, token } = payload;
        this.$store.commit('manageSync/SET_PROJECT_NAME', projectName);
        this.$store.commit('manageSync/SET_TOKEN', token);
        this.displayModal(Modals.CONFIRMATION_REGISTER);
      },
      handleConfirmationSuccess(payload) {
        const { targetFacility } = payload;
        this.$store.commit('manageCSV/SET_REGISTERED', targetFacility);
        this.displayModal(false);
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
