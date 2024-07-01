<template>

  <KGrid gutter="16">
    <KGridItem
      v-for="content in contents"
      :key="content.id"
      :layout="{ span: layoutSpan }"
    >
      <ChannelCard
        :isMobile="windowIsSmall"
        :title="content.title || content.name"
        :thumbnail="content.thumbnail"
        :tagline="content.tagline || content.description"
        :numCoachContents="content.num_coach_contents"
        :link="genContentLinkBackLinkCurrentPage(content.id, false, deviceId)"
        :isRemote="isRemote"
      />
    </KGridItem>
    <slot></slot>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useCardLayoutSpan from '../composables/useCardLayoutSpan';
  import useContentLink from '../composables/useContentLink';
  import ChannelCard from './ChannelCard';

  export default {
    name: 'ChannelCardGroupGrid',
    components: {
      ChannelCard,
    },
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();
      const { layoutSpan } = useCardLayoutSpan();
      return {
        genContentLinkBackLinkCurrentPage,
        windowIsSmall,
        layoutSpan,
      };
    },
    props: {
      contents: {
        type: Array,
        required: true,
      },
      deviceId: {
        type: String,
        required: false,
        default: null,
      },
      isRemote: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .grid {
    padding-top: 8px;
  }

</style>
