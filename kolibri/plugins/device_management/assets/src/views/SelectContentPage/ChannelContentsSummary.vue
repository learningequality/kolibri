<template>

  <section>
    <div class="channel-header">
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
      >
      <div class="channel-name">
        <h1>
          {{ channel.name }}
        </h1>
        <UiIcon
          v-if="channel.public === false"
          class="lock-icon"
        >
          <mat-svg name="lock_open" category="action" />
        </UiIcon>
      </div>
      <p class="version">
        {{ $tr('version', { version: versionNumber }) }}
      </p>
      <p>
        {{ channel.description }}
      </p>
    </div>

    <table class="channel-statistics">
      <tr class="headers">
        <th></th>
        <th>{{ $tr('resourcesCol') }}</th>
        <th>{{ $tr('sizeCol') }}</th>
      </tr>
      <tr>
        <th>{{ $tr('totalSizeRow') }}</th>
        <td>{{ $tr('resourceCount', { count: channel.total_resources || 0 }) }}</td>
        <td>{{ bytesForHumans(channel.total_file_size || 0) }}</td>
      </tr>
      <tr>
        <th>{{ $tr('onDeviceRow') }}</th>
        <td>{{ $tr('resourceCount', { count: channel.on_device_resources || 0 }) }}</td>
        <td>{{ bytesForHumans(channel.on_device_file_size || 0) }}</td>
      </tr>
    </table>
  </section>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  export default {
    name: 'ChannelContentsSummary',
    components: {
      UiIcon,
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
      channelOnDevice: {
        type: Object,
        default() {
          return {};
        },
      },
    },
    computed: {
      versionNumber() {
        if (this.channelOnDevice.version === undefined) {
          return this.channel.version;
        }
        return this.channelOnDevice.version;
      },
    },
    methods: {
      bytesForHumans,
    },
    $trs: {
      onDeviceRow: 'On your device',
      resourcesCol: 'Resources',
      resourceCount: '{count, number, useGrouping}',
      sizeCol: 'Size',
      totalSizeRow: 'Total size',
      version: 'Version {version, number, integer}',
    },
  };

</script>


<style lang="scss" scoped>

  .thumbnail {
    max-width: 200px;
  }

  .lock-icon {
    font-size: 32px;
    vertical-align: sub;
  }

  .version {
    margin-bottom: 32px;
    font-size: 14px;
    font-weight: bold;
  }

  .channel-statistics {
    min-width: 150px;
    margin: 16px 0;
  }

  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

  th {
    text-align: left;
  }

  .headers th,
  td {
    text-align: right;
  }

</style>
