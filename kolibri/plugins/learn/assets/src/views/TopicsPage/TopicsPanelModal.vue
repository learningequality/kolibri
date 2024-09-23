<template>

  <component
    :is="windowIsLarge ? 'div' : 'SidePanelModal'"
    alignment="left"
    role="region"
    :class="windowIsLarge ? 'side-panel' : ''"
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
    <div :class="windowIsLarge ? '' : 'drawer-panel'">
      <div
        v-for="t in topics || []"
        :key="t.id"
      >
        <KRouterLink
          ref="folders"
          :text="t.title"
          class="side-panel-folder-link"
          :appearanceOverrides="{ color: $themeTokens.text }"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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

  .drawer-panel {
    padding-bottom: 60px;
  }

  .side-panel {
    position: fixed;
    top: 60px;
    left: 0;
    height: 100%;
    padding: 24px 24px 0;
    overflow-y: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;
  }

  /*
  * Work around for https://bugzilla.mozilla.org/show_bug.cgi?id=1417667
  */
  .side-panel::after {
    display: block;
    padding-bottom: 70px;
    content: '';
  }

  .side-panel-folder-link {
    margin-top: 12px;
    margin-bottom: 12px;

    /deep/ .link-text {
      text-decoration: none !important;
    }
  }

  /deep/ .prop-icon {
    position: absolute;
    top: 10px;
    right: 10px;
  }

</style>
