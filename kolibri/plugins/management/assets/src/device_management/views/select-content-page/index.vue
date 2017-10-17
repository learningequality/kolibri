<template>

  <div>
    <!-- Notifications here -->
    <section class="summary">
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
          <td></td>
          <td></td>
        </tr>
      </table>
    </section>
  </div>

</template>


<script>

  import bytesForHumans from '../manage-content-page/bytesForHumans';

  export default {
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
      },
    },
    $trs: {
      onDeviceRow: 'On your device',
      resourcesCol: 'Resources',
      sizeCol: 'Size',
      totalSizeRow: 'Total size',
      version: 'Version {version, number, integer}',
      resourceCount: '{count, number, useGrouping}',
    },
  }

</script>


<style lang="stylus" scoped></style>
