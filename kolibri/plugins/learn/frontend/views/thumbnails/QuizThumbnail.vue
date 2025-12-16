<template>

  <Thumbnail :rounded="rounded">
    <template #icon>
      <KIcon
        icon="exercise"
        :color="$themePalette.grey.v_700"
      />
    </template>
  </Thumbnail>

</template>


<script>

  import Thumbnail from './Thumbnail';

  /**
   * A simple thumbnail for a quiz that displays
   * `exercise` icon on top of gray background
   */
  export default {
    name: 'QuizThumbnail',
    components: {
      Thumbnail,
    },
    props: {
      rounded: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>
