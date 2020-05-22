<template>

  <section>
    <div class="channel-header">
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
      >
      <div class="channel-name">
        <KTooltip reference="lockicon" :refs="$refs" placement="right">
          {{ $tr('unlistedChannelTooltip') }}
        </KTooltip>
        <h1>
          <KLabeledIcon icon="channel" :label="channel.name" />
          <KIcon
            v-if="channel.public === false"
            ref="lockicon"
            class="lock-icon"
            icon="unlistedchannel"
          />
        </h1>
      </div>
      <p class="version">
        {{ $tr('version', { version: versionNumber }) }}
      </p>
      <p dir="auto">
        {{ channel.description }}
      </p>
    </div>

    <table class="channel-statistics">
      <tr>
        <th class="text-align-right th-td-default"></th>
        <th class="text-align-right th-td-default">
          {{ coreString('resourcesLabel') }}
        </th>
        <th class="text-align-right th-td-default">
          {{ $tr('sizeCol') }}
        </th>
      </tr>
      <tr>
        <th class="text-align-left th-td-default">
          {{ $tr('totalSizeRow') }}
        </th>
        <td class="text-align-right th-td-default">
          {{ $tr('resourceCount', { count: channel.total_resources || 0 }) }}
        </td>
        <td class="text-align-right th-td-default">
          {{ bytesForHumans(channel.total_file_size || 0) }}
        </td>
      </tr>
      <tr>
        <th class="text-align-left th-td-default">
          {{ $tr('onDeviceRow') }}
        </th>
        <td class="text-align-right th-td-default">
          {{ $tr('resourceCount', { count: channel.on_device_resources || 0 }) }}
        </td>
        <td class="text-align-right th-td-default">
          {{ bytesForHumans(channel.on_device_file_size || 0) }}
        </td>
      </tr>
    </table>
  </section>

</template>


<script>

  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ChannelContentsSummary',
    mixins: [commonCoreStrings],
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
        if (!this.channelOnDevice.available || this.channelOnDevice.version === undefined) {
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
      resourceCount: '{count, number, useGrouping}',
      sizeCol: 'Size',
      totalSizeRow: 'Total size',
      version: 'Version {version, number, integer}',
      unlistedChannelTooltip: 'Unlisted channel',
    },
  };

</script>


<style lang="scss" scoped>

  .channel-header {
    margin-top: 16px;
  }

  .thumbnail {
    max-width: 200px;
  }

  .lock-icon {
    margin-left: 16px;
  }

  .version {
    margin-bottom: 32px;
    font-size: 14px;
    font-weight: bold;
  }

  .channel-statistics {
    min-width: 150px;
    margin: 16px 0;

    .text-align-left {
      text-align: left;
    }

    .text-align-right {
      text-align: right;
    }

    .th-td-default {
      height: 2em;
      padding-right: 24px;
      font-size: 14px;
    }
  }

</style>
