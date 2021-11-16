<template>

  <div class="content-grid">
    <KFixedGrid
      v-if="(cardViewStyle === 'card' && !!numCols)"
      :numCols="numCols"
      gutter="24"
    >
      <KFixedGridItem v-for="content in contents" :key="content.id" span="1">
        <HybridLearningContentCard
          class="card-grid-item"
          :isMobile="windowIsSmall"
          :content="content"
          :thumbnail="content.thumbnail"
          :link="genContentLink(content.id, topicId, content.is_leaf, backRoute, context)"
          @openCopiesModal="openCopiesModal"
          @toggleInfoPanel="$emit('toggleInfoPanel', content)"
        />
      </KFixedGridItem>
    </KFixedGrid>
    <div v-else-if="currentPage === 'lessonPage' || (windowIsSmall && isLibraryPage)">
      <HybridLearningLessonCard
        v-for="content in contents"
        :key="content.id"
        :content="content"
        :thumbnail="content.thumbnail || getContentNodeThumbnail(content)"
        class="card-grid-item"
        :isMobile="windowIsSmall"
        :link="genContentLink(content.id, topicId, content.is_leaf, backRoute, context)"
      />
    </div>
    <CardGrid
      v-else-if=" !isBookmarksPage && cardViewStyle === 'card' && windowIsSmall"
    >
      <ResourceCard
        v-for="(content, idx) in contents"

        :key="`resource-${idx}`"
        :contentNode="content"
        :to="genContentLink(content.id, topicId, content.is_leaf, backRoute, context)"
      />
    </CardGrid>

    <HybridLearningContentCardListView
      v-for="content in contents"
      v-else
      :key="content.id"
      :content="content"
      :thumbnail="content.thumbnail"
      :currentPage="currentPage"
      class="card-grid-item"
      :isMobile="windowIsSmall"
      :link="genContentLink(content.id, topicId, content.is_leaf, backRoute, context)"
      :footerIcons="footerIcons"
      :createdDate="content.bookmark ? content.bookmark.created : null"
      @openCopiesModal="openCopiesModal"
      @viewInformation="$emit('toggleInfoPanel', content)"
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

  import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { PageNames } from '../constants';
  import genContentLink from '../utils/genContentLink';
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
        required: false,
        default: null,
      },
      getContentNodeThumbnail: {
        type: Function,
        default: () => '',
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
      ...mapState('lessonPlaylist', ['currentLesson']),
      pageName() {
        return this.$route.name;
      },
      isBookmarksPage() {
        return this.pageName === PageNames.BOOKMARKS;
      },
      isLibraryPage() {
        return this.pageName === PageNames.LIBRARY;
      },
      context() {
        const context = {};
        if (this.currentLesson && this.currentLesson.classroom) {
          context.lessonId = this.currentLesson.id;
          context.classId = this.currentLesson.classroom.id;
        } else if (this.isLibraryPage || this.pageName === PageNames.TOPICS_TOPIC_SEARCH) {
          Object.assign(context, this.$route.query);
        }
        return context;
      },
      topicId() {
        if (
          this.pageName === PageNames.TOPICS_TOPIC ||
          this.pageName === PageNames.TOPICS_TOPIC_SEARCH
        ) {
          return this.$route.params.id;
        } else {
          return null;
        }
      },
      backRoute() {
        return this.pageName;
      },
    },
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

  .card-grid-item {
    margin-bottom: $gutters;
  }

</style>
