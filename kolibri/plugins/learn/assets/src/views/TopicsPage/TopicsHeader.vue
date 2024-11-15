<template>

  <div
    ref="header"
    class="header"
    :style="{
      backgroundColor: $themeTokens.surface,
    }"
  >
    <KGrid gutter="0">
      <KGridItem
        class="breadcrumbs"
        data-test="header-breadcrumbs"
        :layout4="{ span: 4 }"
        :layout8="{ span: 8 }"
        :layout12="{ span: 12 }"
      >
        <KBreadcrumbs
          v-if="breadcrumbs.length"
          :items="breadcrumbs"
          :ariaLabel="learnString('channelAndFoldersLabel')"
        />
      </KGridItem>
      <KGridItem
        :layout4="{ span: 4, alignment: 'auto' }"
        :layout8="{ span: 8, alignment: 'auto' }"
        :layout12="{ span: 12, alignment: 'auto' }"
      >
        <h1
          class="title"
          data-test="header-title"
        >
          <KTextTruncator
            :text="title"
            :maxLines="1"
          />
        </h1>
      </KGridItem>

      <KGridItem
        v-if="thumbnail"
        class="thumbnail"
        :layout4="{ span: 1 }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 2 }"
      >
        <ChannelThumbnail
          class="thumbnail"
          :thumbnail="thumbnail"
          :isMobile="windowIsSmall"
        />
      </KGridItem>

      <!-- tagline or description -->
      <KGridItem
        v-if="description"
        class="text"
        :layout4="{ span: thumbnail ? 3 : 4, alignment: 'auto' }"
        :layout8="{ span: thumbnail ? 6 : 8, alignment: 'auto' }"
        :layout12="{ span: thumbnail ? 10 : 12, alignment: 'auto' }"
      >
        <KTextTruncator
          class="text-description"
          :text="description"
          :maxLines="4"
        />
      </KGridItem>
    </KGrid>
    <div>
      <slot name="sticky-sidebar"></slot>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ChannelThumbnail from '../ChannelThumbnail';
  import commonLearnStrings from './../commonLearnStrings';

  export default {
    name: 'TopicsHeader',
    components: {
      ChannelThumbnail,
      KBreadcrumbs,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: null,
      },
      thumbnail: {
        type: String,
        default: null,
      },
      breadcrumbs: {
        type: Array,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $header-height: 274px;
  $toolbar-height: 70px;

  .header {
    position: relative;
    top: $toolbar-height;
    width: 100%;
    height: $header-height;
    padding-top: 16px;
    padding-right: 32px;
    padding-bottom: 0;
    padding-left: 32px;
  }

  .title {
    margin: 8px 0 16px;
  }

  .text-description {
    padding-left: 15px;
  }

</style>
