<template>

  <section>
    <div class="channel-header">
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
        loading="lazy"
      >
      <div class="channel-name">
        <KTooltip
          reference="lockicon"
          :refs="$refs"
          placement="right"
        >
          {{ $tr('unlistedChannelTooltip') }}
        </KTooltip>
        <h1>
          <KLabeledIcon icon="channel">
            <template #iconAfter>
              <KIcon
                v-if="channel.public === false"
                ref="lockicon"
                icon="unlistedchannel"
              />
            </template>
            <KTextTruncator :text="channel.name" />
          </KLabeledIcon>
        </h1>
      </div>

      <KFixedGrid numCols="4">
        <KFixedGridItem
          :span="windowIsSmall ? 4 : 1"
          class="version"
        >
          <p :style="[windowIsSmall ? { marginBottom: 0 } : {}]">
            {{ $tr('version', { version: versionNumber }) }}
          </p>
        </KFixedGridItem>
        <KFixedGridItem
          :span="windowIsSmall ? 4 : 3"
          :alignment="windowIsSmall ? 'left' : 'right'"
        >
          <p><slot></slot></p>
        </KFixedGridItem>
      </KFixedGrid>

      <p dir="auto">
        {{ channel.description }}
      </p>
    </div>

    <table class="channel-statistics">
      <tr class="headers">
        <th></th>
        <th>{{ coreString('resourcesLabel') }}</th>
        <th>{{ $tr('sizeCol') }}</th>
      </tr>
      <tr>
        <th>{{ $tr('totalSizeRow') }}</th>
        <td>{{ $formatNumber(channel.total_resources || 0, { useGrouping: true }) }}</td>
        <td>{{ bytesForHumans(channel.total_file_size || 0) }}</td>
      </tr>
      <tr>
        <th>{{ $tr('onDeviceRow') }}</th>
        <td>{{ $formatNumber(channel.on_device_resources || 0, { useGrouping: true }) }}</td>
        <td>{{ bytesForHumans(channel.on_device_file_size || 0) }}</td>
      </tr>
      <tr v-if="channel.new_resource_count !== null">
        <th>{{ $tr('newOrUpdatedLabel') }}</th>
        <td>{{ $formatNumber(channel.new_resource_count || 0, { useGrouping: true }) }}</td>
        <td>{{ bytesForHumans(channel.new_resource_total_size || 0) }}</td>
      </tr>
      <tr v-if="!remoteContentEnabled && freeSpace !== null">
        <th>{{ $tr('freeDisk') }}</th>
        <td></td>
        <td>{{ bytesForHumans(freeSpace || 0) }}</td>
      </tr>
    </table>
  </section>

</template>


<script>

  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import plugin_data from 'kolibri-plugin-data';

  export default {
    name: 'ChannelContentsSummary',
    components: {},
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
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
      freeSpace: {
        type: Number,
        default: null,
      },
    },
    computed: {
      versionNumber() {
        if (!this.channelOnDevice.available || this.channelOnDevice.version === undefined) {
          return this.channel.version;
        }
        return this.channelOnDevice.version;
      },
      remoteContentEnabled() {
        return plugin_data.isRemoteContent;
      },
    },
    methods: {
      bytesForHumans,
    },
    $trs: {
      onDeviceRow: {
        message: 'On your device',
        context: "Indicates resources that are on the user's device.",
      },
      sizeCol: {
        message: 'Size',
        context:
          'Refers to the weight or size (usually in MB or GB) that a resource takes up on a device.',
      },
      totalSizeRow: {
        message: 'Total size',
        context:
          'Refers to the total weight or size (usually in MB or GB) that resources takes up on a device.\n',
      },
      version: {
        message: 'Version {version, number, integer}',
        context:
          'Indicates the channel version. This can be updated when new resources are made available in a channel.',
      },
      unlistedChannelTooltip: {
        message: 'Unlisted channel',
        context:
          'Tooltip to indicate a private channel which shows with the unlisted channel icon.\n\nSee also: https://kolibri.readthedocs.io/en/latest/manage/resources.html?#import-with-token',
      },
      newOrUpdatedLabel: {
        message: 'New or updated',
        context:
          'Table header for the number and size of resources that will be added to a channel after upgrading',
      },
      freeDisk: {
        message: 'Free disk space',
        context:
          "In the 'Advanced' section this indicates how much disk space is free on the Device.",
      },
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

  .version {
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
