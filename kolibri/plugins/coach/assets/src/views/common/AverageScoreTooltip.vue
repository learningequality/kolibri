<template>

  <div ref="icon" style="display:inline;">
    <KIcon
      icon="error"
      :color="$themeTokens.primary"
      style="position: relative; top:4px; left: 4px;"
    />
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      {{ $tr('visibleToLearnersTooltipMessage') }}
    </KTooltip>
  </div>

</template>


<script>

  export default {
    name: 'AverageScoreTooltip',
    $trs: {
      visibleToLearnersTooltipMessage: {
        message: 'Calculated only from quizzes that were completed',
        context:
          'A message for a tooltip that shows when the user hovers over a small icon that tells the user that the Average Quiz Score is calculated only using quizzes that learners completed.',
      },
    },
  };

</script>
