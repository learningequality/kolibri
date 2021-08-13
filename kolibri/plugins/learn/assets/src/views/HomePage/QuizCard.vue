<template>

  <CardLink :to="to">
    <KFixedGrid
      numCols="2"
      :style="{ marginBottom: '12px' }"
    >
      <KFixedGridItem span="1">
        <QuizThumbnail rounded />
      </KFixedGridItem>
      <KFixedGridItem span="1" />
    </KFixedGrid>
    <div v-if="collectionName">
      {{ collectionName }}
    </div>
    <h3
      dir="auto"
      :style="{ marginTop: '2px' }"
    >
      {{ quiz.title }}
    </h3>
  </CardLink>

</template>


<script>

  import CardLink from '../cards/CardLink';
  import QuizThumbnail from '../thumbnails/QuizThumbnail';

  export default {
    name: 'QuizCard',
    components: {
      CardLink,
      QuizThumbnail,
    },
    props: {
      quiz: {
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
       * of the quiz
       */
      collectionName: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>
