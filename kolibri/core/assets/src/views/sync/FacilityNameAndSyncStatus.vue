<template>

  <div>
    <div>
      <h2 class="name">
        <KLabeledIcon icon="facility">
          {{ facility.name }}
          <template #iconAfter>
            <KIcon
              v-if="facility.dataset.registered"
              ref="icon"
              icon="registered"
              :style="{ fill: $themePalette.green.v_500 }"
            />
          </template>
        </KLabeledIcon>
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
        <template v-if="facility.syncing || isSyncing">
          <KCircularLoader class="loader" :size="16" :delay="false" />
          {{ $tr('syncing') }}
        </template>
        <template v-else-if="isDeleting">
          <KCircularLoader class="loader" :size="16" :delay="false" />
          {{ getTaskString('removingFacilityStatus') }}
        </template>
        <template v-else>
          <span v-if="syncHasFailed" class="sync-message">
            {{ $tr('syncFailed') }}
          </span>
          <span v-if="facility.last_synced === null" class="sync-message">
            {{ $tr('neverSynced') }}
          </span>
          <span v-else class="sync-message">
            {{ $tr('lastSync', { relativeTime: formattedTime(facility.last_synced) }) }}
          </span>
        </template>
      </span>
    </div>
  </div>

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';
  import taskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';

  export default {
    name: 'FacilityNameAndSyncStatus',
    mixins: [taskStrings],
    props: {
      facility: {
        type: Object,
        required: true,
      },
      isSyncing: {
        type: Boolean,
        default: false,
      },
      syncHasFailed: {
        type: Boolean,
        default: false,
      },
      isDeleting: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        now: now(),
      };
    },
    methods: {
      formattedTime(datetime) {
        if (this.now - new Date(datetime) < 10000) {
          return this.$tr('justNow');
        }
        return this.$formatRelative(datetime, { now: this.now });
      },
    },
    $trs: {
      registeredAlready: {
        message: 'Registered to `Kolibri Data Portal`',
        context:
          'If a Kolibri facility is part of a larger organization that tracks data on the Kolibri Data Portal,  it can be registered to the Kolibri Data Portal.\n\nThis text indicates that the facility has been registered to the Data Portal.',
      },
      neverSynced: {
        message: 'Never synced',
        context:
          '\nThis is associated with the label "Last successful sync:", and the subject is the Facility',
      },
      lastSync: {
        message: 'Last successful sync: {relativeTime}',
        context:
          'Used to indicate a time period when the last successful sync took place. For example, the value of last successful sync could be something like "2 months ago".\'\n',
      },
      justNow: {
        message: 'Just now',
        context:
          '\nThis is used to indicate when an event occurred. It\'s associated with the label "Last successful sync:"',
      },
      syncFailed: {
        message: 'Most recent sync failed',
        context:
          'This text will display under the name of the facility in Device > FACILITIES section if the most recent attempt at syncing has been unsuccessful.',
      },
      syncing: {
        message: 'Syncing',
        context: 'Indicates when a syncing process between facilities is in progress.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .name {
    display: inline-block;
    margin: 8px 0;
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
