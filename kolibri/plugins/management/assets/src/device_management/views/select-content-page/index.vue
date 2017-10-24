<template>

  <div>
    <!-- Notifications here -->
    <section class="summary">
      <div class="updates" v-if="newVersionAvailable">
        <div class="version-available">
          {{ $tr('newVersionAvailable', { version: channel.version })}}
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
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import bytesForHumans from '../manage-content-page/bytesForHumans';

  export default {
    name: 'selectContentPage',
    components: {

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
        newVersionAvailable: ({ pageState }) => pageState.channel.version > pageState.channelOnDevice.version
      },
    },
    $trs: {
      newVersionAvailable: 'Version {version, number, integer} available',
      onDeviceRow: 'On your device',
      resourcesCol: 'Resources',
      sizeCol: 'Size',
      totalSizeRow: 'Total size',
      update: 'Update',
      version: 'Version {version, number, integer}',
      resourceCount: '{count, number, useGrouping}',
    },
  }

</script>


<style lang="stylus" scoped></style>
