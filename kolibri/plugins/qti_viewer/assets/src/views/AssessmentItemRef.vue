<template>

  <AssessmentItem
    v-if="assessmentItem"
    :json="assessmentItem"
  />

</template>


<script>

  import jsonMixin from '../mixins/jsonMixin';
  import qtiMixin from '../mixins/qtiMixin';
  import xmlParse from '../utils/xml';
  import AssessmentItem from './AssessmentItem';

  const domParser = new DOMParser();

  export default {
    name: 'AssessmentItemRef',
    components: {
      AssessmentItem,
    },
    mixins: [jsonMixin, qtiMixin],
    provide() {
      return {
        getDom: this.getAssessmentItemDom,
      };
    },
    data() {
      return {
        assessmentItem: null,
      };
    },
    computed: {
      href() {
        const relativeHref = this.json && this.json['@href'];
        if (relativeHref) {
          return new URL(
            relativeHref,
            new URL(this.getFilePath(), 'http://b.b/')
          ).pathname.substring(1);
        }
        return '';
      },
    },
    created() {
      this.getFileString(this.href).then(qtiXML => {
        const json = xmlParse(qtiXML);
        this.assessmentItemDom = domParser.parseFromString(qtiXML.trim(), 'text/xml');
        this.assessmentItem = json.assessmentItem && json.assessmentItem[0];
      });
    },
    methods: {
      getAssessmentItemDom() {
        return this.assessmentItemDom;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
