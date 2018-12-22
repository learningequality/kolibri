<template>

  <span>{{ text }}</span>

</template>


<script>

  const FIXED = 'fixed';
  const RANDOM = 'random';

  const orders = [FIXED, RANDOM];

  const LABEL = 'label';
  const DESCRIPTION = 'description';
  const LONG = 'long';

  const variations = [LABEL, DESCRIPTION, LONG];

  export default {
    name: 'QuestionOrder',
    components: {},
    props: {
      order: {
        type: String,
        default: FIXED,
        validator(value) {
          return orders.includes(value);
        },
      },
      variation: {
        type: String,
        default: LABEL,
        validator(value) {
          return variations.includes(value);
        },
      },
    },
    computed: {
      text() {
        if (this.order === FIXED) {
          return this.$tr(this.variation + 'Fixed');
        }
        return this.$tr(this.variation + 'Random');
      },
    },
    $trs: {
      labelFixed: 'Fixed',
      labelRandom: 'Randomized',
      longFixed: 'Fixed: each learner sees the same question order',
      descriptionFixed: 'Each learner sees the same question order',
      descriptionRandom: 'Each learner sees a different question order',
      longRandom: 'Randomized: each learner sees a different question order',
    },
  };

</script>


<style lang="scss" scoped></style>
