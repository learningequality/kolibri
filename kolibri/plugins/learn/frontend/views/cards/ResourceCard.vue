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
      <KButton
        v-if="contentNode.copies"
        appearance="basic-link"
        class="copies"
        :text="coreString('copies', { num: contentNode.copies.length })"
        @click.prevent="$emit('openCopiesModal', contentNode.copies)"
      />
    </template>
    <template #footer>
      <div class="progress-section">
        <slot name="footer">
          <ProgressBar :contentNode="contentNode" />
        </slot>
      </div>
    </template>
  </KCard>

</template>


<script>

  import { computed } from 'vue';
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
    setup(props) {
      const { getChannelThumbnail } = useChannels();

      const title = computed(() => (props.contentNode ? props.contentNode.title : ''));

      const thumbnailUrl = computed(() => {
        const thumbnail = props.contentNode.thumbnail;
        if (!thumbnail && !props.contentNode.parent) {
          return getChannelThumbnail(props.contentNode?.channel_id);
        }
        return thumbnail;
      });

      return {
        title,
        thumbnailUrl,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * Vue-router link object.
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

  .thumbnail-icon {
    width: 40%;
    height: auto;
    font-size: 40%;
  }

</style>
