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
        <ui-icon
          class="lock-icon"
          v-if="channel.public === false"
        >
          <mat-svg name="lock_open" category="action" />
        </ui-icon>
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
        <td>{{ $tr('resourceCount', { count: channelOnDevice.on_device_resources || 0 }) }}</td>
        <td>{{ bytesForHumans(channelOnDevice.on_device_file_size || 0) }}</td>
      </tr>
    </table>
  </section>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from '../manage-content-page/bytesForHumans';

  export default {
    name: 'channelContentsSummary',
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
        return this.channelOnDevice.version || this.channel.version;
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


<style lang="stylus" scoped>

  .thumbnail
    max-width: 200px

  .description
    max-width: 66%

  .title
    font-size: 32px
    font-weight: bold
    display: inline

  .lock-icon
    font-size: 32px
    vertical-align: sub

  .channel-title
    margin-bottom: 8px

  .version
    font-size: 14px
    margin-bottom: 32px

  .channel-statistics
    margin: 36px 0

  tr.headers > th
    padding: 8px 0
    text-align: right
    font-weight: normal
    min-width: 125px
    &:nth-child(1)
      min-width: 175px

  tr.total-size, tr.on-device
    td
      text-align: right
      padding: 8px 0
      &:first-of-type
        text-align: left

</style>
