<template>

  <immersive-full-screen
    backPageText="Back"
    :backPageLink="goBackLink"
  >
    <subpage-container withSideMargin>
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
        <div class="updates">
          <template v-if="newVersionAvailable">
            <span>
              {{ $tr('newVersionAvailable', { version: channel.version }) }}
            </span>
            <k-button
              :text="$tr('update')"
              :primary="true"
            />
          </template>
          <template v-else>
            <span>{{ $tr('channelUpToDate') }}</span>
          </template>
        </div>

        <div class="channel-header">
          <div class="thumbnail">
            <img :src="channel.thumbnail"></img>
          </div>
          <h2 class="title">
            {{ channel.name }}
          </h2>
          <p class="version">
            {{ $tr('version', { version: channel.version }) }}
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
          <selected-resources-size
            :mode="mode"
            :fileSize="selectedItems.total_file_size"
            :resourceCount="selectedItems.total_resource_count"
            :remainingSpace="remainingSpace"
          />
        </section>

        <hr></hr>

        <section class="resources-tree-view">
          <content-tree-viewer />
        </section>
      </template>
    </subpage-container>
  </immersive-full-screen>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import selectedResourcesSize from './selected-resources-size';
  import contentTreeViewer from './content-tree-viewer';
  import bytesForHumans from '../manage-content-page/bytesForHumans';
  import uiAlert from 'keen-ui/src/UiAlert';
  import subpageContainer from '../containers/subpage-container';
  import { installedChannelList, wizardState } from '../../state/getters';

  export default {
    name: 'selectContentPage',
    components: {
      contentTreeViewer,
      immersiveFullScreen,
      kButton,
      selectedResourcesSize,
      subpageContainer,
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
      goBackLink() {
        return {
          name: 'wizardtransition',
          params: {
            transition: 'cancel',
          },
        };
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
      channelUpToDate: 'Channel up-to-date',
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .summary
    position: relative

  .updates
    position: absolute
    right: 0
    button
      margin-left: 16px

  .title
    font-size: 32px
    font-weight: bold

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
  hr
    background-color: $core-grey
    height: 1px
    border: none

</style>
