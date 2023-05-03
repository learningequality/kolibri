<template>

  <KGrid>
    <KGridItem
      v-for="content in contents"
      :key="content.id"
      :layout="{ span: layoutSpan }"
    >
      <ChannelCard
        :isMobile="windowIsSmall"
        :title="content.title || content.name"
        :thumbnail="content.thumbnail"
        :tagline="getTagLine(content)"
        :numCoachContents="content.num_coach_contents"
        :link="genContentLinkBackLinkCurrentPage(content.id, false, deviceId)"
        :isRemote="isRemote"
      />
    </KGridItem>
    <slot></slot>

  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useContentLink from '../composables/useContentLink';
  import ChannelCard from './ChannelCard';

  export default {
    name: 'ChannelCardGroupGrid',
    components: {
      ChannelCard,
    },
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { windowBreakpoint, windowIsSmall } = useKResponsiveWindow();
      return {
        genContentLinkBackLinkCurrentPage,
        windowBreakpoint,
        windowIsSmall,
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
    computed: {
      layoutSpan() {
        let span = 3;
        if ([0, 1, 2, 6].includes(this.windowBreakpoint)) {
          span = 4;
        } else if ([3, 4, 5].includes(this.windowBreakpoint)) {
          span = 6;
        }
        return span;
      },
    },
    methods: {
      getTagLine(content) {
        return content.tagline || content.description;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
