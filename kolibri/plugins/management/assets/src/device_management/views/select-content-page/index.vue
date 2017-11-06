<template>

  <div>
    <section class="notifications">
      <ui-alert
        v-if="newVersionAvailable"
        type="info"
        :removeIcon="true"
        :dismissible="false"
      >
        {{ $tr('newVersionAvailableNotification') }}
      </ui-alert>
    </section>

    <section class="summary">
      <div class="updates" v-if="newVersionAvailable">
        <div class="version-available">
          {{ $tr('newVersionAvailable', { version: channel.version }) }}
        </div>
        <k-button
          :text="$tr('update')"
          :primary="true"
        />
      </div>

      <div class="channel-header">
        <div class="thumbnail">
          <img :src="channel.thumbnail"></img>
        </div>
        <div class="title">
          {{ channel.name }}
        </div>
        <div class="version">
          {{ $tr('version', { version: channel.version }) }}
        </div>
        <div class="description">
          {{ channel.description }}
        </div>
      </div>

      <table class="channel-statistics">
        <tr>
          <th></th>
          <th>{{ $tr('resourcesCol') }}</th>
          <th>{{ $tr('sizeCol') }}</th>
        </tr>

        <tr class="total-size">
          <td>{{ $tr('totalSizeRow') }}</td>
          <td>{{ $tr('resourceCount', { count: channel.total_resource_count }) }}</td>
          <td>{{ bytesForHumans(channel.total_file_size) }}</td>
        </tr>

        <tr class="on-device">
          <td>{{ $tr('onDeviceRow') }}</td>
          <td>{{ $tr('resourceCount', { count: channelOnDevice.on_device_resources }) }}</td>
          <td>{{ bytesForHumans(channelOnDevice.on_device_file_size) }}</td>
        </tr>
      </table>
    </section>

    <template v-if="onDeviceInfoIsReady">
      <section class="selected-resources-size">
        <selectedResourcesSize
          :mode="mode"
          :fileSize="selectedItems.total_file_size"
          :resourceCount="selectedItems.total_resource_count"
          :remainingSpace="remainingSpace"
        />
      </section>

      <section class="resources-tree-view">
        <content-tree-viewer />
      </section>
    </template>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import selectedResourcesSize from './selected-resources-size';
  import contentTreeViewer from './content-tree-viewer';
  import bytesForHumans from '../manage-content-page/bytesForHumans';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { installedChannelList, wizardState } from '../../state/getters';

  export default {
    name: 'selectContentPage',
    components: {
      contentTreeViewer,
      kButton,
      selectedResourcesSize,
      uiAlert,
    },
    computed: {
      channelOnDevice() {
        const match = this.installedChannelList.find(channel => channel.id === this.channel.id);
        return match || {
          on_device_file_size: 0,
          on_device_resources: 0,
        };
      },
      newVersionAvailable() {
        if (this.channelOnDevice.version) {
          return this.channel.version > this.channelOnDevice.version;
        }
        return false;
      },
    },
    methods: {
      bytesForHumans,
    },
    vuex: {
      getters: {
        installedChannelList,
        channel: state => wizardState(state).meta.channel,
        databaseIsLoading: ({ pageState }) => pageState.databaseIsLoading,
        mode: state => wizardState(state).meta.transferType === 'localexport' ? 'export' : 'import',
        onDeviceInfoIsReady: () => true,
        remainingSpace: state => wizardState(state).remainingSpace,
        selectedItems: state => wizardState(state).selectedItems|| {},
      },
    },
    $trs: {
      newVersionAvailable: 'Version {version, number} available',
      onDeviceRow: 'On your device',
      resourcesCol: 'Resources',
      sizeCol: 'Size',
      totalSizeRow: 'Total size',
      update: 'Update',
      newVersionAvailableNotification: 'New channel version available. Some of your old files may be outdated or deleted.',
      version: 'Version {version, number, integer}',
      resourceCount: '{count, number, useGrouping}',
    },
  }

</script>


<style lang="stylus" scoped></style>
