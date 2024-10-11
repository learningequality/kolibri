<template>

  <div v-if="facility">
    <div>
      <h2 class="name">
        <KLabeledIcon icon="facility">
          {{ facility.name }}
          <template #iconAfter>
            <KIcon
              v-if="facility.dataset.registered"
              ref="icon"
              icon="registered"
              :style="{ fill: $themeTokens.success }"
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
          <KCircularLoader
            class="loader"
            :size="16"
            :delay="false"
          />
          {{ $tr('syncing') }}
        </template>
        <template v-else-if="isDeleting">
          <KCircularLoader
            class="loader"
            :size="16"
            :delay="false"
          />
          {{ getTaskString('removingFacilityStatus') }}
        </template>
        <template v-else>
          <span
            v-if="syncFailed"
            class="sync-message"
          >
            {{ $tr('syncFailed') }}
          </span>
          <span
            v-else-if="neverSynced"
            class="sync-message"
          >
            {{ $tr('neverSynced') }}
          </span>
          <!-- Always show the last successful sync time when available -->
          <span
            v-if="facility.last_successful_sync"
            class="sync-message"
          >
            {{ $tr('lastSync', { relativeTime: formattedTime(facility.last_successful_sync) }) }}
          </span>
        </template>
        <KButton
          :text="$tr('createSync')"
          :disabled="isSyncing || isDeleting"
          appearance="basic-link"
          @click="manageSync"
        />
      </span>
    </div>
  </div>

</template>


<script>

  import useNow from 'kolibri/composables/useNow';
  import taskStrings from 'kolibri-common/uiText/tasks';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'FacilityNameAndSyncStatus',
    mixins: [taskStrings, commonCoreStrings],
    setup() {
      const { now } = useNow();
      return { now };
    },
    props: {
      facility: {
        type: Object,
        required: true,
      },
      isSyncing: {
        type: Boolean,
        default: false,
      },
      syncTaskHasFailed: {
        type: Boolean,
        default: false,
      },
      isDeleting: {
        type: Boolean,
        default: false,
      },
      goToRoute: {
        type: Object,
        required: true,
      },
    },
    computed: {
      syncFailed() {
        const lastSyncFailed =
          this.facility &&
          this.facility.last_successful_sync &&
          this.facility.last_failed_sync &&
          new Date(this.facility.last_successful_sync).getTime() <
          new Date(this.facility.last_failed_sync).getTime();
        return this.syncTaskHasFailed || lastSyncFailed;
      },
      neverSynced() {
        return (
          this.facility && !this.facility.last_successful_sync && !this.facility.last_failed_sync
        );
      },
    },
    methods: {
      formattedTime(datetime) {
        if (this.now - new Date(datetime) < 10000) {
          return this.coreString('justNow');
        }
        return this.$formatRelative(datetime, { now: this.now });
      },
      manageSync() {
        this.$router.push(this.goToRoute);
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
          'This is associated with the label "Last successful sync:", and the subject is the Facility.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      nextSync: {
        message: 'Next sync: {relativeTime}',
        context:
          'Used to indicate the next scheduled sync of facility data. For example, "in 5 days".\'\n',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
      lastSync: {
        message: 'Last synced: {relativeTime}',
        context:
          'Used to indicate a time period when the last sync took place. For example, the value of last successful sync could be something like "2 months ago".\'\n',
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
      createSync: {
        message: 'Create sync schedule',
        context: 'Link to create sync schedule',
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
