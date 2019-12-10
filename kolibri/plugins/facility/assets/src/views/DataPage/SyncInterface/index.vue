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
            <div>
              <h2 class="name">
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
              </h2>
            </div>
            <div>
              <span>
                <template v-if="facility.syncing">
                  <KCircularLoader class="loader" :size="16" :delay="false" />
                  {{ $tr('syncing') }}
                </template>
                <template v-else>
                  <template v-if="facility.last_sync_failed">
                    {{ $tr('syncFailed') }}
                  </template>
                  <template v-if="facility.last_synced === null">
                    {{ $tr('neverSynced') }}
                  </template>
                  <template v-else>
                    {{ $tr('lastSync') }} {{ formattedTime(facility.last_synced) }}
                  </template>
                </template>
              </span>
            </div>
          </td>
          <td class="button-col">
            <KButton
              appearance="raised-button"
              :text="$tr('register')"
              :disabled="facilityTaskId !== ''"
              @click="register(facility)"
            />
            <KButton
              class="sync"
              appearance="raised-button"
              :text="$tr('sync')"
              :disabled="facilityTaskId !== '' || !facility.dataset.registered"
              @click="sync(facility)"
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
  import { now } from 'kolibri.utils.serverClock';
  import { TaskResource } from 'kolibri.resources';
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
    data: () => ({
      now: now(),
    }),
    computed: {
      ...mapState('manageSync', ['modalShown']),
      ...mapState('manageCSV', ['facilityTaskId', 'facilities']),
      Modals: () => Modals,
    },
    methods: {
      ...mapActions('manageSync', ['displayModal']),
      register(facility) {
        this.$store.commit('manageSync/SET_TARGET_FACILITY', facility);
        this.displayModal(Modals.REGISTER_FACILITY);
      },
      formattedTime(lastSyncedDate) {
        if (this.now - new Date(lastSyncedDate) < 10000) {
          return this.$tr('justNow');
        }
        return this.$formatRelative(lastSyncedDate, { now: this.now });
      },
      sync(facility) {
        TaskResource.dataportalsync(facility.id).then(response => {
          this.$store.commit('manageCSV/START_FACILITY_SYNC', response.entity);
        });
      },
    },
    $trs: {
      syncData: 'Sync facility data',
      access:
        'This is an experimental feature. You can use it if you have access to the Kolibri Data Portal.',
      learnMore: 'Usage and privacy',
      facility: 'Facility',
      register: 'Register',
      registeredAlready: 'Registered to `Kolibri Data Portal`',
      sync: 'Sync',
      neverSynced: {
        message: 'Never synced',
        context:
          '\nThis is associated with the label "Last successful sync:", and the subject is the Facility',
      },
      lastSync: 'Last successful sync:',
      justNow: {
        message: 'Just now',
        context:
          '\nThis is used to indicate when an event occurred. It\'s associated with the label "Last successful sync:"',
      },
      syncFailed: 'Most recent sync failed.',
      syncing: 'Syncing',
    },
  };

</script>


<style lang="scss" scoped>

  /* derived from .core-table-button-col */
  .button-col {
    padding: 4px;
    padding-top: 8px;
    text-align: right;

    .sync {
      margin-right: 0;
    }
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
