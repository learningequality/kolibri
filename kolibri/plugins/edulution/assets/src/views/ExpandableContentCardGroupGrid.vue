<template>

  <div class="collapsible-grid">
    <div
      class="clickable-header"
      :style="{ backgroundColor: $coreActionNormal }"
      :class="{'expanded-header': !hidden}"
      @click="hidden = !hidden"
    >

      <div
        class="topic-thumbnail"
        style="display: inline-block"
        :style="thumbnailBackground"
      >
        <ContentIcon
          v-if="!child.thumbnail"
          :kind="ContentNodeKinds.TOPIC"
          class="type-icon"
          :style="{ color: $coreTextAnnotation }"
        />
      </div>
      <PageHeader :title="child.title" style="display: inline-block; vertical-align: middle;" />
      <UiIconButton
        type="secondary"
        size="large"
        style="float: right; margin: 24px 24px 0 0"
        disabled
      >
        <mat-svg v-if="!hidden" name="expand_less" category="navigation" />
        <mat-svg v-else name="expand_more" category="navigation" />
      </UiIconButton>
      <div
        v-if="child.progress !== undefined"
        class="progress-bar-wrapper"
        :style="{ backgroundColor: $coreGrey }"
      >
        <div
          class="progress-bar"
          :style="{
            width: `${child.progress * 100}%`,
            backgroundColor: isMastered ?
              $coreStatusMastered : (isInProgress ? $coreStatusProgress : ''),
          }"
        >
        </div>
      </div>
    </div>
    <div :class="{'hidden-grid': hidden}">
      <ContentCardGroupGrid
        v-if="child.children.length"
        :contents="child.children"
        :genContentLink="genContentLink"
        style="padding-left: 48px; padding-top: 48px"
      />
    </div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { PageNames } from '../constants';
  import PageHeader from '../../../../learn/assets/src/views/PageHeader';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'ExpandableContentCardGroupGrid',
    components: {
      PageHeader,
      ContentCardGroupGrid,
      UiIconButton,
      ContentIcon,
      ContentNodeKinds,
    },
    mixins: [themeMixin],
    props: { child: Object },
    data() {
      return {
        hidden: true,
      };
    },
    computed: {
      ContentNodeKinds() {
        return ContentNodeKinds;
      },
      isMastered() {
        return this.child.progress === 1;
      },
      isInProgress() {
        return this.child.progress > 0 && this.child.progress < 1;
      },
      thumbnailBackground() {
        return {
          backgroundSize: 'cover',
          backgroundColor: this.$coreBgLight,
          backgroundImage: `url('${this.child.thumbnail}')`,
        };
      },
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.KNOWLEDGE_MAP,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
  };

</script>


<style lang="scss">

  @import '../../../../learn/assets/src/views/ContentCard/card';

  .collapsible-grid {
    margin-bottom: 8px;
    overflow: auto;
    border-radius: 8px;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .clickable-header {
    color: white;
    border-radius: 8px;
  }

  .expanded-header {
    border-radius: 8px 8px 0 0;
  }

  .hidden-grid {
    display: none;
  }

  .progress-bar-wrapper {
    width: 100%;
    height: 8px;
    opacity: 0.9;
  }

  .progress-bar {
    height: 100%;
  }

  .topic-thumbnail {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 16px;
    vertical-align: middle;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    border-radius: 50%;
  }

  .type-icon {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%) scale(3);
  }

</style>
