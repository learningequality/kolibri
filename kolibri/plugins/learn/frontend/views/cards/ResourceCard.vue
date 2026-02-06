<template>

  <KCard
    :to="to"
    :title="title"
    :headingLevel="3"
    orientation="vertical"
    thumbnailDisplay="large"
    :thumbnailSrc="thumbnailUrl"
    thumbnailAlign="left"
  >
    <template #thumbnailPlaceholder>
      <LearningActivityIcon
        v-if="contentNode.is_leaf"
        :kind="contentNode.learning_activities"
        class="thumbnail-icon"
      />
      <KIcon
        v-else
        icon="topic"
        :color="$themePalette.grey.v_700"
        class="thumbnail-icon"
      />
    </template>
    <template #aboveTitle>
      <div class="above-title">
        <div
          v-if="collectionTitle"
          class="collection-title"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ collectionTitle }}
        </div>
        <LearningActivityLabel
          v-if="contentNode.is_leaf"
          :contentNode="contentNode"
          hideDuration
        />
        <KLabeledIcon
          v-else
          iconAfter="topic"
          :label="coreString('folder')"
        />
      </div>
    </template>
    <template #footer>
      <div class="progress-section">
        <ProgressBar
          v-if="!$slots.footer"
          :contentNode="contentNode"
        />
      </div>
    </template>
  </KCard>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useChannels from 'kolibri-common/composables/useChannels';
  import ProgressBar from '../ProgressBar';
  import LearningActivityLabel from '../LearningActivityLabel';

  export default {
    name: 'ResourceCard',
    components: {
      LearningActivityIcon,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { getChannelThumbnail } = useChannels();
      return { getChannelThumbnail };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
    },
    computed: {
      title() {
        return this.contentNode ? this.contentNode.title : '';
      },
      thumbnailUrl() {
        const thumbnail = this.contentNode.thumbnail;
        if (!thumbnail) {
          const parent = this.contentNode.parent;
          if (!parent) {
            return this.getChannelThumbnail(this.contentNode && this.contentNode.channel_id);
          }
        }
        return thumbnail;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .copies {
    float: right;
    padding-top: 4px;
  }

  .above-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .collection-title {
    font-size: 12px;
  }

  .resource-card-outer {
    position: relative;
  }

  .topic-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 10px;
    border-radius: 8px 8px 0 0;
  }

  .thumbnail-icon {
    font-size: 48px;
  }

</style>
