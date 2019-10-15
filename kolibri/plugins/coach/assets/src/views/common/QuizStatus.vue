<template>

  <KPageContainer>
    <KButton
      v-if="!exam.active"
      :primary="true"
      text="Open Quiz"
      type="submit"
      style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
    />
    <KButton
      v-if="exam.active"
      text="Close Quiz"
      type="submit"
      style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
    />
    <div>
      <b>{{ coachString('recipientsLabel') }}</b>
    </div>
    <div>
      <Recipients
        slot="value"
        :groupNames="groupNames"
        :hasAssignments="exam.assignments.length > 0"
      />
    </div>
    <div>
      <b>Average score</b>
    </div>
    <div>
      <Score :value="avgScore" />
    </div>
    <div>
      <b>Question order</b>
    </div>
    <div>{{ orderDescriptionString }}</div>
  </KPageContainer>

</template>

<script>

  import { coachStringsMixin } from './commonCoachStrings';
  import Score from './Score';
  import Recipients from './Recipients';

  export default {
    name: 'QuizStatus',
    components: { Score, Recipients },
    mixins: [coachStringsMixin],
    props: {
      groupNames: {
        type: Array,
        required: true,
      },
      exam: {
        type: Object,
        required: true,
      },
      avgScore: {
        type: Number,
        required: false,
      },
    },
    computed: {
      orderDescriptionString() {
        return this.exam.learners_see_fixed_order
          ? this.coachString('orderFixedLabel')
          : this.coachString('orderRandomLabel');
      },
    },
  };

</script>

<style scoped lang='scss'>

  div:nth-child(2n) {
    margin-top: 1.5rem;
  }
  div {
    font-size: 0.925rem;
  }

</style>
