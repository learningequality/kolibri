<template>

  <KGrid>
    <KGridItem
      v-for="content in contents"
      :key="content.id"
      :layout="{ span: cardColumnSpan }"
    >
      <ChannelCard
        :isMobile="windowIsSmall"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :tagline="getTagLine(content)"
        :progress="content.progress || 0"
        :numCoachContents="content.num_coach_contents"
        :link="genContentLink(content.id, content.is_leaf)"
        :contentId="content.content_id"
        :copiesCount="content.copies_count"
        @openCopiesModal="openCopiesModal"
      />
    </KGridItem>

    <CopiesModal
      v-if="modalIsOpen"
      :uniqueId="uniqueId"
      :sharedContentId="sharedContentId"
      @submit="modalIsOpen = false"
    />
  </KGrid>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import ChannelCard from './ChannelCard';
  import CopiesModal from './CopiesModal';

  export default {
    name: 'ChannelCardGroupGrid',
    components: {
      ChannelCard,
      CopiesModal,
    },
    mixins: [responsiveWindowMixin],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      genContentLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
        default: () => ({}),
        required: false,
      },
    },
    data: () => ({
      modalIsOpen: false,
      sharedContentId: null,
      uniqueId: null,
    }),
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
      },
    },
    methods: {
      openCopiesModal(contentId) {
        this.sharedContentId = contentId;
        this.uniqueId = this.contents.find(content => content.content_id === contentId).id;
        this.modalIsOpen = true;
      },
      getTagLine(content) {
        return content.tagline || content.description;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
