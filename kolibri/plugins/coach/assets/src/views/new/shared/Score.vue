<template>

  <span>
    <template v-if="value === undefined">-</template>
    <template v-else>{{ $tr('score', {score: value}) }}</template>
  </span>

</template>


<script>

  export default {
    name: 'Score',
    components: {},
    props: {
      value: {
        type: Number,
        required: false,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
    $trs: {
      score: '{score, number, percent}',
    },
  };

</script>


<style lang="scss" scoped></style>
