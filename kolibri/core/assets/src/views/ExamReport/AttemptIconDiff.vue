<template>

  <KIcon
    v-if="correct && diff >= 1"
    data-testid="correct-icon"
    :style="{ fill: $themeTokens.correct }"
    icon="plus"
  />

</template>


<script>

  export default {
    name: 'AttemptIconDiff',
    props: {
      correct: {
        type: Number,
        required: true,
      },
      diff: {
        type: Number,
        required: true,
      },
    },
  };

</script>
