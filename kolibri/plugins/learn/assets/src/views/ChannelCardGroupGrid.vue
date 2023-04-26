<template>

  <KGrid>
    <KGridItem
      v-for="content in contents"
      :key="content.id"
      :layout12="{ span: 3 }"
      :layout8="{ span: 4 }"
      :layout4="{ span: 4 }"
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
    methods: {
      getTagLine(content) {
        return content.tagline || content.description;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
