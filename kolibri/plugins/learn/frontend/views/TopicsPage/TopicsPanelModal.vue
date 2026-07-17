<template>

  <component
    :is="windowIsLarge ? 'div' : 'SidePanelModal'"
    alignment="left"
    role="region"
    :aria-label="learnString('filterAndSearchLabel')"
    :ariaLabel="learnString('filterAndSearchLabel')"
    :style="
      windowIsLarge
        ? {
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
          width: width,
        }
        : {}
    "
    @closePanel="$emit('close')"
    @shouldFocusFirstEl="focusFirstEl()"
  >
    <div :class="windowIsLarge ? 'panel-content' : 'drawer-panel'">
      <h2
        v-if="windowIsLarge"
        class="panel-heading"
      >
        {{ coreString('folders') }}
      </h2>
      <div
        v-for="t in topics || []"
        :key="t.id"
      >
        <KRouterLink
          ref="folders"
          :text="t.title"
          class="side-panel-folder-link"
          :appearanceOverrides="{ color: $themeTokens.primary }"
          :to="genContentLinkKeepCurrentBackLink(t.id, false)"
        />
      </div>
      <KButton
        v-if="topicMore && !topicsLoading"
        appearance="basic-link"
        @click="$emit('loadMoreTopics')"
      >
        {{ coreString('viewMoreAction') }}
      </KButton>
      <KCircularLoader v-if="topicsLoading" />
    </div>
  </component>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonLearnStrings from '../commonLearnStrings';
  import useContentLink from '../../composables/useContentLink';

  export default {
    name: 'TopicsPanelModal',
    components: { SidePanelModal },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      const { genContentLinkKeepCurrentBackLink } = useContentLink();
      return {
        genContentLinkKeepCurrentBackLink,
        windowIsLarge,
      };
    },
    props: {
      topicMore: {
        type: Boolean,
        default: false,
      },
      topics: {
        type: Array,
        default() {
          return [];
        },
      },
      topicsLoading: {
        type: Boolean,
        default: false,
      },
      width: {
        type: [Number, String],
        required: false,
        default: null,
      },
    },
    methods: {
      focusFirstEl() {
        if (this.$refs.folders && this.$refs.folders.length > 0) {
          this.$refs.folders[0].$el.focus();
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .drawer-panel {
    padding-bottom: 60px;
  }

  .panel-content {
    padding: 24px 24px 48px;
  }

  .panel-heading {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: bold;
  }

  .side-panel-folder-link {
    margin-top: 12px;
    margin-bottom: 12px;
  }

  /deep/ .prop-icon {
    position: absolute;
    top: 10px;
    right: 10px;
  }

</style>
