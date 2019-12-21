<template>

  <CoreInfoIcon
    :tooltipText="$tr('visibleToLearnersTooltipMessage')"
    :iconAriaLabel="$tr('visibleToLearnersTooltipMessage')"
  />

</template>


<script>

  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';

  export default {
    name: 'AverageScoreTooltip',
    components: {
      CoreInfoIcon,
    },
    $trs: {
      visibleToLearnersTooltipMessage: {
        message: 'Calculated only from quizzes that were completed',
        context:
          'A message for a tooltip that shows when the user hovers over a small icon that tells the user that the Average Quiz Score is calculated only using quizzes that learners completed.',
      },
    },
  };

</script>
