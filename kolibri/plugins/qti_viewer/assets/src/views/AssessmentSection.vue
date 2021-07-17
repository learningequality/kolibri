<template>

  <div>
    <AssessmentItem
      v-if="assessmentItem"
      :json="assessmentItem"
    />
    <AssessmentItemRef
      v-else-if="assessmentItemRef"
      :json="assessmentItemRef"
    />
  </div>

</template>


<script>

  import jsonMixin from '../mixins/jsonMixin';
  import qtiMixin from '../mixins/qtiMixin';
  import AssessmentItem from './AssessmentItem';
  import AssessmentItemRef from './AssessmentItemRef';

  export default {
    name: 'AssessmentSection',
    components: {
      AssessmentItem,
      AssessmentItemRef,
    },
    mixins: [jsonMixin, qtiMixin],
    data() {
      return {
        assessmentItemIndex: 0,
      };
    },
    computed: {
      assessmentItem() {
        return (
          this.json &&
          this.json.assessmentItem &&
          this.json.assessmentItem[this.assessmentItemIndex]
        );
      },
      assessmentItemRef() {
        return (
          this.json &&
          this.json.assessmentItemRef &&
          this.json.assessmentItemRef[this.assessmentItemIndex]
        );
      },
    },
  };

</script>
