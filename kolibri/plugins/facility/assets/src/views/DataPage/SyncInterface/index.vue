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
            <KButtonGroup style="margin-top: 8px;">
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
      @cancel="displayModal(null)"
    />

    <RegisterFacilityModal
      v-if="modalShown === Modals.REGISTER_FACILITY"
      @cancel="displayModal(null)"
      @success="handleValidateSuccess"
    />
    <ConfirmationRegisterModal
      v-if="modalShown === Modals.CONFIRMATION_REGISTER"
      v-bind="{ projectName, targetFacility, token }"
      @cancel="displayModal(null)"
      @success="handleConfirmationSuccess"
    />

  </KPageContainer>

</template>


<script>

  import { mapState } from 'vuex';
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
    data() {
      return {
        projectName: '',
        token: '',
        targetFacility: null,
        modalShown: null,
      };
    },
    computed: {
      ...mapState('manageCSV', ['facilityTaskId']),
      Modals: () => Modals,
      facilities() {
        return this.$store.state.manageCSV.facilities.filter(
          ({ id }) => id === this.$store.getters.activeFacilityId
        );
      },
    },
    methods: {
      displayModal(modal) {
        this.modalShown = modal;
      },
      register(facility) {
        this.targetFacility = facility;
        this.modalShown = Modals.REGISTER_FACILITY;
      },
      sync(facility) {
        TaskResource.dataportalsync(facility.id).then(response => {
          this.$store.commit('manageCSV/START_FACILITY_SYNC', response.entity);
        });
      },
      handleValidateSuccess(payload) {
        const { name, token } = payload;
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
