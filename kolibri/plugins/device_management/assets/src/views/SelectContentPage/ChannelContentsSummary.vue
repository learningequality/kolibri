<template>

  <section>
    <div class="channel-header">
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
      >
      <div class="channel-name">
        <h2 class="title">
          {{ channel.name }}
        </h2>
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
      <p class="description">
        {{ channel.description }}
      </p>
    </div>

    <table class="channel-statistics">
      <tr class="headers">
        <th></th>
        <th>{{ $tr('resourcesCol') }}</th>
        <th>{{ $tr('sizeCol') }}</th>
      </tr>

      <tr class="total-size">
        <td>{{ $tr('totalSizeRow') }}</td>
        <td>{{ $tr('resourceCount', { count: channel.total_resources || 0 }) }}</td>
        <td>{{ bytesForHumans(channel.total_file_size || 0) }}</td>
      </tr>

      <tr class="on-device">
        <td>{{ $tr('onDeviceRow') }}</td>
        <td>{{ $tr('resourceCount', { count: channel.on_device_resources || 0 }) }}</td>
        <td>{{ bytesForHumans(channel.on_device_file_size || 0) }}</td>
      </tr>
    </table>
  </section>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from '../ManageContentPage/bytesForHumans';

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

  .description {
    max-width: 66%;
  }

  .title {
    display: inline;
    font-size: 32px;
    font-weight: bold;
  }

  .lock-icon {
    font-size: 32px;
    vertical-align: sub;
  }

  .channel-title {
    margin-bottom: 8px;
  }

  .version {
    margin-bottom: 32px;
    font-size: 14px;
  }

  .channel-statistics {
    margin: 36px 0;
  }

  tr.headers > th {
    min-width: 125px;
    padding: 8px 0;
    font-weight: normal;
    text-align: right;
    &:nth-child(1) {
      min-width: 175px;
    }
  }

  tr.total-size,
  tr.on-device {
    td {
      padding: 8px 0;
      text-align: right;
      &:first-of-type {
        text-align: left;
      }
    }
  }

</style>
