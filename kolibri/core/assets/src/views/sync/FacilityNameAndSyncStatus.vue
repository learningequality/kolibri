<template>

  <div>
    <div>
      <h2 class="name">
        {{ facility.name }}
        <UiIcon v-if="facility.dataset.registered" ref="icon">
          <mat-svg
            name="verified_user"
            category="action"
            :style="{ fill: $themePalette.green.v_500 }"
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
          <span v-if="facility.last_sync_failed" class="sync-message">
            {{ $tr('syncFailed') }}
          </span>
          <span v-if="facility.last_synced === null" class="sync-message">
            {{ $tr('neverSynced') }}
          </span>
          <span v-else class="sync-message">
            {{ $tr('lastSync') }} {{ formattedTime(facility.last_synced) }}
          </span>
        </template>
      </span>
    </div>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import has from 'lodash/has';
  import every from 'lodash/every';
  import { now } from 'kolibri.utils.serverClock';

  const facilityFields = [
    'name',
    'dataset.registered',
    'syncing',
    'last_sync_failed',
    'last_synced',
  ];

  export default {
    name: 'FacilityNameAndSyncStatus',
    components: {
      UiIcon,
    },
    mixins: [],
    props: {
      facility: {
        type: Object,
        required: true,
        validator(value) {
          return every(facilityFields, field => has(value, field));
        },
      },
    },
    data() {
      return {
        now: now(),
      };
    },
    computed: {},
    methods: {
      formattedTime(datetime) {
        if (this.now - new Date(datetime) < 10000) {
          return this.$tr('justNow');
        }
        return this.$formatRelative(datetime, { now: this.now });
      },
    },
    $trs: {
      registeredAlready: 'Registered to `Kolibri Data Portal`',
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
      syncFailed: 'Most recent sync failed',
      syncing: 'Syncing',
    },
  };

</script>


<style lang="scss" scoped>

  .name {
    display: inline-block;
    margin: 8px;
    margin-left: 0;
  }

  .loader {
    top: 3px;
    display: inline-block;
    margin-right: 8px;
  }

  .sync-message {
    display: block;
  }

</style>
