<template>

  <div>
    <div class="sync-status">
      {{ $tr('deviceStatus') }}
    </div>
    <div class="notification">
      <span>
        <KIcon
          icon="error"
          class="inline-icon"
          data-test="syncStatusIcon"
        />
      </span>
      <span>
        <p>{{ $tr('NotEnoughSpace') }}</p>
      </span>
    </div>
  </div>

</template>


<script>

  import { useUserSyncStatus } from '../composables/useUserSyncStatus';

  export default {
    name: 'SideNavStorageNotification',
    setup() {
      const {
        queued,
        lastSynced,
        status,
        deviceStatus,
        deviceStatusSentiment,
      } = useUserSyncStatus();
      return { queued, lastSynced, status, deviceStatus, deviceStatusSentiment };
    },
    props: {},
    $trs: {
      NotEnoughSpace: {
        message: 'Not enough storage',
        context: 'Status label for a device has run out of storage space.',
      },
      deviceStatus: {
        message: 'Device status',
        context:
          "Label in the side navigation menu. Indicates the status of an individual learner's device.",
      },
    },
  };

</script>


<style scoped>
.inline-icon{
    font-size:20px;
    vertical-align: top;
}
.notification{
    display:inline-flex;
}
span p{
    margin:4px;
}
.sync-status {
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }
</style>
