<template>

  <CardLink :to="to">
    <KFixedGrid
      numCols="2"
      :style="{ marginBottom: '12px' }"
    >
      <KFixedGridItem span="1">
        <ContentNodeThumbnail
          :contentNode="contentNode"
          rounded
        />
      </KFixedGridItem>
      <KFixedGridItem
        span="1"
        alignment="right"
      >
        <LearningActivityLabel :contentNode="contentNode" />
      </KFixedGridItem>
    </KFixedGrid>
    <div v-if="collectionName">
      {{ collectionName }}
    </div>
    <h3
      dir="auto"
      :style="{ marginTop: '2px' }"
    >
      {{ contentNode.title }}
    </h3>
  </CardLink>

</template>


<script>

  import CardLink from '../cards/CardLink';
  import ContentNodeThumbnail from '../thumbnails/ContentNodeThumbnail';
  import LearningActivityLabel from './LearningActivityLabel';

  export default {
    name: 'ResourceCard',
    components: {
      ContentNodeThumbnail,
      CardLink,
      LearningActivityLabel,
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
      /**
       * Name of a class or a topic folder
       * of the content node
       */
      collectionName: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>
