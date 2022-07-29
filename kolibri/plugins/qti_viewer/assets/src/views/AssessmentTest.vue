<template>

  <div>
    <AssessmentSection
      v-if="assessmentSection"
      :json="assessmentSection"
    />
    <KButton @click="previous">
      Back
    </KButton>
    <KButton @click="next">
      Continue
    </KButton>
  </div>

</template>


<script>

  import jsonMixin from '../mixins/jsonMixin';
  import qtiMixin from '../mixins/qtiMixin';
  import AssessmentSection from './AssessmentSection';

  export default {
    name: 'AssessmentTest',
    components: {
      AssessmentSection,
    },
    mixins: [jsonMixin, qtiMixin],
    data() {
      return {
        testPartIndex: 0,
        sectionIndex: 0,
      };
    },
    computed: {
      testPart() {
        return this.json && this.json.testPart && this.json.testPart[this.testPartIndex];
      },
      assessmentSection() {
        return (
          this.testPart &&
          this.testPart.assessmentSection &&
          this.testPart.assessmentSection[this.sectionIndex]
        );
      },
    },
    methods: {
      next() {},
      previous() {},
    },
  };

</script>
