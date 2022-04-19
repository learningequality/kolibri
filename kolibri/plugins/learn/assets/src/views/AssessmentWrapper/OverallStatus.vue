<template>

  <div>
    <!-- TODO Delete this component, the strings should live in different
    namespaces in the next release - this is here to be crossComponentTranslated
    until the next batch of translations -->
  </div>

</template>


<script>

  export default {
    name: 'OverallStatus',
    $trs: {
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      goal: {
        message: 'Get {count, number, integer} {count, plural, other {correct}}',
        context:
          'Message that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
      },
    },
  };

</script>
