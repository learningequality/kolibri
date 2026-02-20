<template>

  <Thumbnail
    :thumbnailUrl="thumbnailUrl"
    :rounded="rounded"
  >
    <template #icon>
      <LearningActivityIcon
        v-if="contentNode.is_leaf"
        :kind="contentNode.learning_activities"
      />
      <KIcon
        v-else
        icon="topic"
        :color="$themePalette.grey.v_700"
      />
    </template>

    <template #labels>
      <slot name="labels"></slot>
    </template>
  </Thumbnail>

</template>


<script>

  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useChannels from 'kolibri-common/composables/useChannels';
  import Thumbnail from './Thumbnail';

  /**
   * A thumbnail for a content node that shows the content node
   * thumbnail image if it's available.
   * When an image is not available, a generic thumbnail
   * made of a learning activity icon or a topic icon
   * on top of gray background will be displayed.
   */
  export default {
    name: 'ContentNodeThumbnail',
    components: {
      LearningActivityIcon,
      Thumbnail,
    },
    setup() {
      const { getChannelThumbnail } = useChannels();
      return {
        getChannelThumbnail,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      rounded: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
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
