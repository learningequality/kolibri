<template>

  <div class="overall-status" :style="{ color: $themeTokens.text }">
    <KIcon
      icon="mastered"
      :color="success ? $themeTokens.mastered : $themePalette.grey.v_200"
    />
    <div class="overall-status-text">
      <span v-if="success" class="completed" :style="{ color: $themeTokens.annotation }">
        {{ coreString('completedLabel') }}
      </span>
      <span>
        {{ $tr('goal', { count: totalCorrectRequiredM }) }}
      </span>
    </div>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'OverallStatus',
    mixins: [responsiveWindowMixin],
    props: {},
    data() {
      return {};
    },
    computed: {},
    watch: {},

    methods: {},

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

  .overall-status {
    margin-bottom: auto;
  }

  .overall-status-text {
    display: inline-block;
    margin-left: 4px;
  }

</style>
