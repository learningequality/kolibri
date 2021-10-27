<template>

  <div class="content-grid">
    <KFixedGrid
      v-if="(cardViewStyle === 'card' && !windowIsSmall || numCols === 2)"
      :numCols="numCols"
      gutter="24"
    >
      <KFixedGridItem v-for="content in contents" :key="content.id" span="1">
        <HybridLearningContentCard
          class="grid-item"
          :isMobile="windowIsSmall"
          :contentNode="content"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :activityLength="content.activity_length"
          :isLeaf="content.is_leaf"
          :progress="content.progress_fraction || 0"
          :numCoachContents="content.num_coach_contents"
          :link="genContentLink(content.id, content.is_leaf)"
          :contentId="content.content_id"
          :copiesCount="content.copies_count"
          :description="content.description"
          :channelThumbnail="content.channel_thumbnail"
          :channelTitle="content.channel_title"
          @openCopiesModal="openCopiesModal"
        />
      </KFixedGridItem>
    </KFixedGrid>
    <HybridLearningLessonCard
      v-for="content in contents"
      v-else-if="currentPage === 'lessonPage' || (windowIsSmall && isLibraryPage)"
      :key="content.id"
      :contentNode="content"
      :channelThumbnail="content.channel_thumbnail"
      :channelTitle="content.channel_title"
      :description="content.description"
      :activityLength="content.activity_length"
      :thumbnail="content.thumbnail || getContentNodeThumbnail(content)"
      class="grid-item"
      :isMobile="windowIsSmall"
      :title="content.title"
      :kind="content.kind"
      :isLeaf="content.is_leaf"
      :progress="content.progress || content.progress_fraction || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.is_leaf)"
    />
    <CardGrid
      v-else-if=" !isBookmarksPage && cardViewStyle === 'card' && windowIsSmall"
    >
      <ResourceCard
        v-for="(content, idx) in contents"

        :key="`resource-${idx}`"
        :contentNode="content"
        :to="genContentLink(content.id, content.is_leaf)"
      />
    </CardGrid>

    <HybridLearningContentCardListView
      v-for="content in contents"
      v-else
      :key="content.id"
      :contentNode="content"
      :channelThumbnail="content.channel_thumbnail"
      :channelTitle="content.channel_title"
      :description="content.description"
      :activityLength="content.activity_length"
      :currentPage="currentPage"
      class="grid-item"
      :isMobile="windowIsSmall"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :isLeaf="content.is_leaf"
      :progress="content.progress_fraction || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.is_leaf)"
      :contentId="content.content_id"
      :copiesCount="content.copies_count"
      :footerIcons="footerIcons"
      :createdDate="content.bookmark ? content.bookmark.created : null"
      @openCopiesModal="openCopiesModal"
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

  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { PageNames } from '../constants';
  import HybridLearningContentCardListView from './HybridLearningContentCardListView';
  import HybridLearningContentCard from './HybridLearningContentCard';
  import HybridLearningLessonCard from './HybridLearningLessonCard';
  import ResourceCard from './cards/ResourceCard';
  import CardGrid from './cards/CardGrid';

  import CopiesModal from './CopiesModal';

  export default {
    name: 'HybridLearningCardGrid',
    components: {
      CopiesModal,
      HybridLearningContentCardListView,
      HybridLearningContentCard,
      HybridLearningLessonCard,
      ResourceCard,
      CardGrid,
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
      },
      currentPage: {
        type: String,
        default: null,
        required: false,
      },
      numCols: {
        type: Number,
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
      getContentNodeThumbnail: {
        type: Function,
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
    computed: {
      isBookmarksPage() {
        return this.currentPage === PageNames.BOOKMARKS;
      },
      isLibraryPage() {
        return this.currentPage === PageNames.LIBRARY;
      },
    },
    methods: {
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
    margin-bottom: $gutters;
  }

</style>
