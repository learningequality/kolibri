<template>

  <div>
    <component
      :is="!windowIsSmall && currentCardViewStyle === 'list' ? 'div' : 'CardGrid'"
      :data-test="`${windowIsSmall ? '' : 'non-'}mobile-card-grid`"
      :style="{ maxWidth: '1700px' }"
      :gridType="gridType"
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

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { validateObject } from 'kolibri/utils/objectSpecs';
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
    setup() {
      const { genContentLinkBackLinkCurrentPage, genContentLinkKeepCurrentBackLink } =
        useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        genContentLinkBackLinkCurrentPage,
        genContentLinkKeepCurrentBackLink,
        windowIsSmall,
      };
    },

    props: {
      contents: {
        type: Array,
        required: true,
        validator: function (contents) {
          return contents.every(content =>
            validateObject(content, {
              id: { type: String, required: true },
              title: { type: String, required: true },
              is_leaf: { type: Boolean, required: true },
              copies: { type: Array, required: false, default: () => [] },
            }),
          );
        },
      },
      currentCardViewStyle: {
        type: String,
        required: true,
        default: 'card',
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
      gridType: {
        type: Number,
        default: 1,
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
