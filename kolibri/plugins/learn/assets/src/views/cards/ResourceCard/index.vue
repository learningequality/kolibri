<template>

  <BaseCard
    v-if="contentNode"
    v-bind="{ to, title, collectionTitle }"
  >
    <template #topLeft>
      <ContentNodeThumbnail
        :contentNode="contentNode"
        rounded
      />
    </template>
    <template #topRight>
      <LearningActivityLabel :contentNode="contentNode" />
    </template>

    <template v-if="contentNodeProgress" #progress>
      <ProgressBar :progress="contentNodeProgress" />
    </template>
  </BaseCard>

</template>


<script>

  import ContentNodeThumbnail from '../../thumbnails/ContentNodeThumbnail';
  import ProgressBar from '../../ProgressBar';
  import BaseCard from '../BaseCard';
  import LearningActivityLabel from './LearningActivityLabel';

  export default {
    name: 'ResourceCard',
    components: {
      BaseCard,
      ContentNodeThumbnail,
      LearningActivityLabel,
      ProgressBar,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      contentNodeProgress: {
        type: Number,
        required: false,
        default: null,
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
    data() {
      return {
        title: this.contentNode ? this.contentNode.title : '',
      };
    },
  };

</script>
