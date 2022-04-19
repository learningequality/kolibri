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
        :color="$themePalette.grey.v_500"
      />
    </template>

    <template #labels>
      <slot name="labels"></slot>
    </template>
  </Thumbnail>

</template>


<script>

  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import LearningActivityIcon from '../LearningActivityIcon';
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
        return getContentNodeThumbnail(this.contentNode);
      },
    },
  };

</script>
