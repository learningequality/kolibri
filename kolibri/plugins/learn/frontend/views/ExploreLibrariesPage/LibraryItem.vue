<template>

  <KGrid
    :debug="false"
    class="library-item"
  >
    <div :class="{ 'library-header': true, 'library-header-sm': windowIsSmall }">
      <KGridItem
        :layout12="{ span: 10 }"
        :layout8="{ span: 6 }"
        :layout4="{ span: 4 }"
      >
        <div>
          <h2 class="device-name">
            <KIcon
              v-if="deviceIcon"
              :icon="deviceIcon"
              class="device-icon"
            />
            <span>{{ deviceName }}</span>
            <KIconButton
              ref="pinIcon"
              :icon="pinIcon"
              :disabled="isStudio"
              appearance="flat-button"
              @click="$emit('togglePin', deviceId)"
            />
            <KTooltip
              reference="pinIcon"
              :refs="$refs"
            >
              {{ pinIcon === 'pinned' ? $tr('removePin') : $tr('pinTo') }}
            </KTooltip>
          </h2>
          <p
            v-if="isStudio"
            class="device-description"
          >
            {{ $tr('channels', { channels: totalChannels }) }}
          </p>
        </div>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 2, alignment: 'right' }"
        :layout8="{ span: 2, alignment: 'right' }"
        :layout4="{ span: 4, alignment: 'right' }"
      >
        <KRouterLink
          appearance="raised-button"
          :text="coreString('explore')"
          :to="genLibraryPageBackLink(deviceId)"
        />
      </KGridItem>
    </div>
    <ChannelCardGroupGrid
      data-test="channel-cards"
      :deviceId="device.id"
      :contents="(channels || []).slice(0, channelsToDisplay)"
      :isRemote="true"
    />
  </KGrid>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useContentLink from '../../composables/useContentLink';
  import { KolibriStudioId } from '../../constants';
  import ChannelCardGroupGrid from '../ChannelCardGroupGrid';

  export default {
    name: 'LibraryItem',
    components: {
      ChannelCardGroupGrid,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { genLibraryPageBackLink } = useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        genLibraryPageBackLink,
        windowIsSmall,
      };
    },
    props: {
      device: {
        type: Object,
        required: true,
        default: () => ({}),
      },
      channels: {
        type: Array,
        required: true,
        default() {
          return [];
        },
      },
      channelsToDisplay: {
        type: Number,
        required: true,
      },
      pinned: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
    computed: {
      totalChannels() {
        return this.channels.length;
      },
      isStudio() {
        return this.deviceId === KolibriStudioId;
      },
      deviceIcon() {
        if (this.device['operating_system'] === 'Android') {
          return 'device';
        } else if (!this.device['subset_of_users_device']) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
      deviceName() {
        return this.device ? this.device.device_name : '';
      },
      deviceId() {
        return this.device ? this.device.instance_id : '';
      },
      pinIcon() {
        return this.pinned ? 'pinned' : 'notPinned';
      },
    },
    $trs: {
      channels: {
        message:
          '{channels, number, integer} channels | Internet connection needed to browse and download resources',
        context: 'Indicates the number of channels on the Kolibri library',
      },
      // The strings below are not used currently used in the code.
      // This is to aid the translation of the string
      /* eslint-disable kolibri/vue-no-unused-translations */
      pinRemoved: {
        message: 'Pin removed from my library page',
        context: 'A notification message displayed after successfully unpinning a library',
      },
      pinTo: {
        message: 'Pin to my library page',
        context: 'A tooltip label shown when hovering over an unpinned library',
      },
      pinnedTo: {
        message: 'Pinned to my library page',
        context: 'A notification message displayed after successfully pinning a library',
      },
      removePin: {
        message: 'Remove pin from my library page',
        context: 'A tooltip label shown when hovering over a pinned library',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .device-name,
  .device-description {
    padding: 0;
    margin: 0 0 15px;
    margin-right: -12px;
    margin-left: -12px;
  }

  .library-header-sm {
    margin-bottom: 20px;
  }

  .library-header,
  .library-channels {
    width: 100%;
  }

  .library-item {
    margin-bottom: 20px;
  }

  .device-icon {
    margin-right: 10px;
  }

</style>
