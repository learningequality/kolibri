<template>

  <KGrid>
    <KGridItem
      v-for="content in contents"
      :key="content.id"
      :layout="{ span: cardColumnSpan, alignment: 'auto' }"
    >
      <ChannelCard
        :isMobile="windowIsSmall"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :tagline="getTagLine(content)"
        :progress="content.progress || 0"
        :numCoachContents="content.num_coach_contents"
        :link="genContentLinkBackLinkCurrentPage(content.id, content.is_leaf)"
        :contentId="content.content_id"
      />
    </KGridItem>

  </KGrid>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useContentLink from '../composables/useContentLink';
  import ChannelCard from './ChannelCard';

  export default {
    name: 'ChannelCardGroupGrid',
    components: {
      ChannelCard,
    },
    mixins: [responsiveWindowMixin],
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      return { genContentLinkBackLinkCurrentPage };
    },
    props: {
      contents: {
        type: Array,
        required: true,
      },
    },
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
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
