<template>

  <KIcon
    v-if="correct && diff >= 1"
    :style="{ fill: $themeTokens.correct }"
    icon="plus"
  />
  <KIcon
    v-else-if="!correct && diff < 0"
    :style="{ fill: $themeTokens.incorrect }"
    icon="minus"
  />

</template>


<script>

  export default {
    name: 'AttemptLogDiffIcon',
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
