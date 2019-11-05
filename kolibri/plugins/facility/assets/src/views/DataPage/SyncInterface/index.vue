<template>

  <KPageContainer>

    <h1>{{ $tr('syncData') }}</h1>
    <span>
      {{ $tr('access') }}
      <KButton
        appearance="basic-link"
        :text="$tr('learnMore')"
        @click="displayModal(Modals.PRIVACY)"
      />
    </span>

    <CoreTable>
      <thead slot="thead">
        <tr>
          <th>{{ $tr('facility') }}</th>
        </tr>
      </thead>
      <transition-group slot="tbody" tag="tbody" name="list">
        <tr v-for="facility in facilities" :key="facility.id">
          <td>
            <span class="name">
              {{ facility.name }}
              <UiIcon v-if="facility.dataset.registered" ref="icon">
                <mat-svg
                  name="verified_user"
                  category="action"
                  :style="{fill: $themePalette.green.v_500}"
                />
              </UiIcon>
              <KTooltip
                reference="icon"
                :refs="$refs"
              >
                {{ $tr('registeredAlready') }}
              </KTooltip>
            </span>
            <span class="synced">
              <span v-if="facility.last_synced === null">
                {{ $tr('neverSynced') }}
              </span>
            </span>
          </td>
          <td>
          </td>
          <td>
            <KButton
              class="register"
              appearance="raised-button"
              :text="$tr('register')"
              @click="register(facility)"
            />
          </td>
        </tr>
      </transition-group>
    </CoreTable>

    <PrivacyModal
      v-if="modalShown===Modals.PRIVACY"
      @cancel="displayModal(false)"
    />

    <RegisterFacilityModal
      v-if="modalShown===Modals.REGISTER_FACILITY"
      @cancel="displayModal(false)"
    />
    <ConfirmationRegisterModal
      v-if="modalShown===Modals.CONFIRMATION_REGISTER"
      @cancel="displayModal(false)"
    />
    <AlreadyRegisteredModal
      v-if="modalShown===Modals.ALREADY_REGISTERED"
      @cancel="displayModal(false)"
    />

  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import UiIcon from 'keen-ui/src/UiIcon';
  import { Modals } from '../../../constants';
  import PrivacyModal from './PrivacyModal';
  import RegisterFacilityModal from './RegisterFacilityModal';
  import ConfirmationRegisterModal from './ConfirmationRegisterModal';
  import AlreadyRegisteredModal from './AlreadyRegisteredModal';

  export default {
    name: 'SyncInterface',
    components: {
      CoreTable,
      PrivacyModal,
      RegisterFacilityModal,
      ConfirmationRegisterModal,
      AlreadyRegisteredModal,
      UiIcon,
    },
    computed: {
      ...mapState({
        facilities: state => state.core.facilities,
      }),
      ...mapState('manageSync', ['modalShown']),
      Modals: () => Modals,
    },
    mounted() {},
    methods: {
      ...mapActions('manageSync', ['displayModal']),
      register(facility) {
        this.$store.commit('manageSync/SET_TARGET_FACILITY', facility);
        this.displayModal(Modals.REGISTER_FACILITY);
      },
    },
    $trs: {
      syncData: 'Sync usage data',
      access:
        '(Experimental feature) If you have access to register to Kolibri Data Portal, sync your data here',
      learnMore: 'Learn more',
      facility: 'Facility',
      register: 'Register',
      registeredAlready: 'Registered to `Kolibri Data Portal`',
      sync: 'Sync',
      neverSynced: 'Never synced',
      lastSynced: 'Last synced: {value, number, integer} days ago',
      syncFailed: 'Most recent sync failed.',
    },
  };

</script>


<style lang="scss" scoped>

  .synced {
    display: table-cell;
    font-size: 12px;
  }
  .sync {
    float: right;
  }

  .register {
    float: right;
  }

</style>
