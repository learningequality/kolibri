<template>

  <div class="content-grid">
    <!-- <KFixedGrid
      v-if="cardViewStyle === 'card'"
      :numCols="this.windowIsSmall ? 1
      : numCols" gutter="24">
      <KFixedGridItem v-for="content in contents" :key="content.id" span="1">
        <ContentCard
          class="grid-item"
          :isMobile="windowIsSmall"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          activityLength="shortActivity"
          :isLeaf="content.is_leaf"
          :progress="content.progress || 0"
          :numCoachContents="content.num_coach_contents"
          :link="genContentLink(content.id, content.is_leaf)"
          :contentId="content.content_id"
          :copiesCount="content.copies_count"
          :description="content.description"
          :channelThumbnail="setChannelThumbnail(content)"
          :channelTitle="channelTitle(content)"
          @openCopiesModal="openCopiesModal"
          @toggleInfoPanel="$emit('toggleInfoPanel', content)"
        />
      </KFixedGridItem>
    </KFixedGrid> -->
    <ContentCardListViewItem
      v-for="content in contents"
      :key="content.id"
      :channelThumbnail="content.channel_thumbnail"
      :channelTitle="content.channel_thumbnail"
      :description="content.description"
      activityLength="shortActivity"
      class="grid-item"
      :isMobile="windowIsSmall"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :isLeaf="content.is_leaf"
      :progress="content.progress || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.is_leaf)"
      :contentId="content.content_id"
      :copiesCount="content.copies_count"
      :footerIcons="footerIcons"
      :createdDate="content.bookmark ? content.bookmark.created : null"
      @openCopiesModal="openCopiesModal"
      @toggleInfoPanel="$emit('toggleInfoPanel', content)"
      @removeFromBookmarks="removeFromBookmarks(content, contents)"
    />
    <CopiesModal
      v-if="modalIsOpen"
      :uniqueId="uniqueId"
      :sharedContentId="sharedContentId"
      @submit="modalIsOpen = false"
    />
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import genContentLink from '../utils/genContentLink';
  import CopiesModal from './CopiesModal';

  export default {
    name: 'ContentCardGroupGrid',
    components: {
      // ContentCard,
      CopiesModal,
    },
    mixins: [responsiveWindowMixin],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      cardViewStyle: {
        type: String,
        required: true,
        default: 'card',
        validator(value) {
          return ['card', 'list'].includes(value);
        },
        default: () => ({}),
        required: false,
      },
      footerIcons: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data: () => ({
      modalIsOpen: false,
      sharedContentId: null,
      uniqueId: null,
    }),
    methods: {
      genContentLink,
      openCopiesModal(contentId) {
        this.sharedContentId = contentId;
        this.uniqueId = this.contents.find(content => content.content_id === contentId).id;
        this.modalIsOpen = true;
      },
      removeFromBookmarks(content, contents) {
        return this.$emit('removeFromBookmarks', content.bookmark, contents.indexOf(content));
      },
    },
  };

</script>


<style lang="scss" scoped>

  $gutters: 16px;
  .grid-item {
    margin-right: $gutters;
    margin-bottom: $gutters;
  }

</style>
