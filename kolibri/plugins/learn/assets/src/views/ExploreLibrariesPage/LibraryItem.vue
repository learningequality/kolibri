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
              :disabled="disablePinDevice"
              appearance="flat-button"
              @click="$emit('togglePin', deviceId)"
            />
            <KTooltip
              reference="pinIcon"
              :refs="$refs"
            >
              {{ (pinIcon === 'pinned') ? $tr('removePin') : $tr('pinTo') }}
            </KTooltip>
          </h2>
          <p
            v-if="showDescription"
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
          :to="genLibraryPageBackLink(deviceId, false)"
        />
      </KGridItem>
    </div>
    <div class="library-channels">
      <KGridItem
        v-for="channel in channels"
        :key="channel.id"
        :layout="{ span: layoutSpan }"
      >
        <ChannelCard
          :title="channel.name"
          :tagline="channel.tagline || channel.description"
          :thumbnail="channel.thumbnail"
          :link="genContentLinkBackLinkCurrentPage(channel.root, false, deviceId)"
          :version="channel.version"
        />
      </KGridItem>
    </div>
  </KGrid>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useContentLink from '../../composables/useContentLink';
  import ChannelCard from '../ChannelCard';

  export default {
    name: 'LibraryItem',
    components: {
      ChannelCard,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { genContentLinkBackLinkCurrentPage, genLibraryPageBackLink } = useContentLink();
      const { windowIsSmall, windowBreakpoint } = useKResponsiveWindow();

      return {
        genContentLinkBackLinkCurrentPage,
        genLibraryPageBackLink,
        windowBreakpoint,
        windowIsSmall,
      };
    },
    props: {
      deviceId: {
        type: String,
        default: null,
      },
      deviceName: {
        type: String,
        required: false,
        default: null,
      },
      deviceIcon: {
        type: String,
        required: false,
        default: null,
      },
      channels: {
        type: Array,
        required: true,
        default() {
          return [];
        },
      },
      pinIcon: {
        type: String,
        required: true,
        default: null,
      },
      totalChannels: {
        type: Number,
        required: false,
        default: 0,
      },
      showDescription: {
        type: Boolean,
        required: false,
        default: false,
      },
      disablePinDevice: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      layoutSpan() {
        /**
         * The breakpoints below represent the window widths
         * 0: < 480px  | Small screen  | 4 columns
         * 1: < 600px  | Small screen  | 4 columns
         * 2: < 840px  | Medium screen | 8 columns
         * 3: < 960px  | Large screen  | 12 columns
         * 4: < 1280px | Large screen  | 12 columns
         * 5: < 1440px | Large screen  | 12 columns
         * 6: < 1600px | Large screen  | 12 columns
         *
         * On resize, display X cards per row where:
         * X = total columns in grid / column span for each card.
         * For example, if the total number of columns is 12, and
         * column span for each cards is 4, then X is 3.
         */
        let span = 3;
        if ([0, 1, 2, 6].includes(this.windowBreakpoint)) {
          span = 4;
        } else if ([3, 4, 5].includes(this.windowBreakpoint)) {
          span = 6;
        }
        return span;
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
