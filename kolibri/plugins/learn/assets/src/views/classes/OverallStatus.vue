<template>

  <div class="overall-container" :style="{ color: $themeTokens.text }">
    <KIconButton
      icon="mastered"
      :disabled="true"
      :color="success ? $themeTokens.mastered : $themePalette.grey.v_200"
    />
    <div class="overall-status">
      <span>
        {{ $tr('goal', { count: totalCorrectRequiredM }) }}
      </span>
      <KIconButton
        v-if="success"
        icon="done"
        :disabled="true"
        :color="$themeTokens.mastered"
      />
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
      ...mapState({
        mastered: state => state.core.logging.mastery.complete,
      }),
      masteryModel() {
        return this.content.masteryModel;
      },
      success() {
        return this.exerciseProgress === 1;
      },
      exerciseProgress() {
        if (this.mastered) {
          return 1;
        }
        return 0; //TODO: switch back to 0
      },
      mOfNMasteryModel() {
        return MasteryModelGenerators[this.masteryModel.type](
          this.assessmentIds,
          this.masteryModel
        );
      },
      totalCorrectRequiredM() {
        console.log('in OverallStatus', this);
        return this.mOfNMasteryModel.m;
      },
    },

    $trs: {
      goal: {
        message: 'Get {count, number, integer} {count, plural, other {correct}}',
        context:
          '\nMessage that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .overall-container {
    // Aligns icon itself to others on its side ltr & rtl
    margin: 0 -16px !important;
  }

  .overall-status {
    display: inline-block;
    margin-left: 4px;
  }

</style>
