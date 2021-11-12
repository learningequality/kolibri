<template>

  <div class="overall-container" :style="{ color: $themeTokens.text }">
    <div class="overall-status">
      <span>
        {{ $tr('goal', { count: totalCorrectRequiredM }) }}
      </span>
    </div>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { mapState } from 'vuex';
  import { MasteryModelGenerators } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'OverallStatus',
    mixins: [responsiveWindowMixin, commonCoreStrings],

    computed: {
      ...mapState('topicsTree', ['content']),
      masteryModel() {
        return this.content.masteryModel;
      },
      mOfNMasteryModel() {
        return MasteryModelGenerators[this.masteryModel.type](
          this.content.assessmentIds,
          this.masteryModel
        );
      },
      totalCorrectRequiredM() {
        return this.mOfNMasteryModel.m;
      },
    },

    $trs: {
      goal: {
        message: 'Get {count, number, integer} {count, plural, other {correct}}',
        context:
          'Message that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .overall-status {
    display: inline-block;
    margin: 8px;
  }

</style>
