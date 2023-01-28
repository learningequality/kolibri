<template>

  <div>
    <!-- small and xs displays -->
    <CardGrid v-if="windowIsSmall" data-test="mobile-card-grid">
      <ResourceCard
        v-for="(content, idx) in contents"
        :key="`resource-${idx}`"
        :data-test="'resource-card-' + idx"
        :contentNode="content"
        :to="contentLink(content.id, content.is_leaf)"
        @openCopiesModal="$emit('openCopiesModal', content.copies)"
      />
    </CardGrid>
    <!-- large displays, card view -->
    <CardGrid
      v-else-if="!windowIsSmall && currentCardViewStyle === 'card'"
      :gridType="gridType"
      data-test="non-mobile-card-grid"
    >
      <HybridLearningContentCard
        v-for="(content, idx) in contents"
        :key="`resource-${idx}`"
        class="card-grid-item"
        :data-test="'content-card-' + idx"
        :isMobile="windowIsSmall"
        :content="content"
        :link="contentLink(content.id, content.is_leaf)"
        @openCopiesModal="$emit('openCopiesModal', content.copies)"
        @toggleInfoPanel="$emit('toggleInfoPanel', content)"
      />
    </CardGrid>
    <!-- large displays, list view -->
    <CardList
      v-for="(content, idx) in contents"
      v-else-if="!windowIsSmall && currentCardViewStyle === 'list'"
      :key="content.id"
      :content="content"
      class="card-grid-item"
      :data-test="'card-list-view-' + idx"
      :link="contentLink(content.id, content.is_leaf)"
      :footerIcons="footerIcons"
      :createdDate="content.bookmark ? content.bookmark.created : null"
      @openCopiesModal="$emit('openCopiesModal', content.copies)"
      @viewInformation="$emit('toggleInfoPanel', content)"
      @removeFromBookmarks="$emit('removeFromBookmarks',content, contents)"
    />
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useContentLink from '../composables/useContentLink';
  import CardGrid from './cards/CardGrid';
  import ResourceCard from './cards/ResourceCard';

  import HybridLearningContentCard from './HybridLearningContentCard';
  import CardList from './CardList';

  export default {
    name: 'LibraryAndChannelBrowserMainContent',

    components: {
      CardGrid,
      HybridLearningContentCard,
      CardList,
      ResourceCard,
    },

    mixins: [responsiveWindowMixin],

    setup() {
      const {
        genContentLinkBackLinkCurrentPage,
        genContentLinkKeepCurrentBackLink,
      } = useContentLink();
      return { genContentLinkBackLinkCurrentPage, genContentLinkKeepCurrentBackLink };
    },

    props: {
      contents: {
        type: Array,
        required: true,
      },
      currentCardViewStyle: {
        type: String,
        required: true,
        default: 'card',
        validator(value) {
          return ['card', 'list'].includes(value);
        },
      },
      // Used to define the "type" (number of columns) for <CardGrid />
      // Currently only either `1` or `2`
      // See props in CardGrid.vue for more details on # of cards per level
      gridType: {
        type: Number,
        required: true,
        default: 1,
      },
      keepCurrentBackLink: {
        type: Boolean,
        default: false,
      },
    },

    computed: {
      footerIcons() {
        return { info: 'viewInformation' };
      },
    },
    methods: {
      contentLink(id, isResource) {
        return this.keepCurrentBackLink && !isResource
          ? this.genContentLinkKeepCurrentBackLink(id, isResource)
          : this.genContentLinkBackLinkCurrentPage(id, isResource);
      },
    },
  };

</script>
