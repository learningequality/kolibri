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
          <td>{{ $tr('resourceCount', { count: channelOnDevice.total_resource_count }) }}</td>
          <td>{{ bytesForHumans(channelOnDevice.total_file_size) }}</td>
        </tr>
      </table>
    </section>

    <section class="selected-resources-size">
      <selectedResourcesSize
        mode="import"
        :fileSize="selectedItems.total_file_size"
        :resourceCount="selectedItems.total_resource_count"
        :remainingSpace="remainingSpace"
      />
    </section>


    <section class="resources-tree-view">

    </section>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import selectedResourcesSize from './selected-resources-size';
  import bytesForHumans from '../manage-content-page/bytesForHumans';
  import uiAlert from 'keen-ui/src/UiAlert';

  export default {
    name: 'selectContentPage',
    components: {
      kButton,
      selectedResourcesSize,
      uiAlert,
    },
    computed: {

    },
    methods: {
      bytesForHumans,
    },
    vuex: {
      getters: {
        channel: ({ pageState }) => pageState.channel,
        channelOnDevice: ({ pageState }) => pageState.channelOnDevice,
        databaseIsLoading: ({ pageState }) => pageState.databaseIsLoading,
        mode: ({ pageState }) => pageState.mode,
        newVersionAvailable: ({ pageState }) => pageState.channel.version > pageState.channelOnDevice.version,
        remainingSpace: ({ pageState }) => pageState.remainingSpace,
        selectedItems: ({ pageState }) => pageState.selectedItems,
      },
    },
    $trs: {
      newVersionAvailable: 'Version {version, number, integer} available',
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
