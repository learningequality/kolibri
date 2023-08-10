<template>

  <div>
    <component
      :is="!windowIsSmall && currentCardViewStyle === 'list' ? 'div' : 'CardGrid'"
      :data-test="`${windowIsSmall ? '' : 'non-'}mobile-card-grid`"
    >
      <component
        :is="componentType"
        v-for="(contentNode, idx) in contents"
        :key="`resource-${idx}`"
        :data-test="componentType + '-' + idx"
        :contentNode="contentNode"
        :to="contentLink(contentNode.id, contentNode.is_leaf)"
        @openCopiesModal="$emit('openCopiesModal', contentNode.copies)"
      >
        <template #footer>
          <HybridLearningFooter
            :contentNode="contentNode"
            :allowDownloads="allowDownloads"
            @toggleInfoPanel="$emit('toggleInfoPanel', contentNode)"
          />
        </template>
      </component>
    </component>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useContentLink from '../composables/useContentLink';
  import CardGrid from './cards/CardGrid';
  import ResourceCard from './cards/ResourceCard';

  import HybridLearningContentCard from './HybridLearningContentCard';
  import HybridLearningFooter from './HybridLearningContentCard/HybridLearningFooter';
  import CardList from './CardList';

  export default {
    name: 'LibraryAndChannelBrowserMainContent',

    components: {
      CardGrid,
      HybridLearningContentCard,
      HybridLearningFooter,
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
      keepCurrentBackLink: {
        type: Boolean,
        default: false,
      },
      // Whether to enable learner initiated downloads on the contained resource cards.
      allowDownloads: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      componentType() {
        if (this.windowIsSmall) {
          return 'ResourceCard';
        }
        if (this.currentCardViewStyle === 'card') {
          return 'HybridLearningContentCard';
        }
        return 'CardList';
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
