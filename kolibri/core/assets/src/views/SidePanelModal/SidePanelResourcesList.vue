<template>

  <!--
    This component file exists only because of the string freeze
    (see the cross-component translator in `AlsoInThis.vue`)
    TODO: Remove
  -->
  <div></div>

</template>


<script>

  export default {
    name: 'SidePanelResourcesList',
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      noOtherLessonResources: {
        message: 'No other resources in this lesson',
        context:
          'Message indicating that no resources remain in the lesson they are engaging with.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      noOtherTopicResources: {
        message: 'No other resources in this folder',
        context: 'Message indicating that no resources remain in the topic they are browsing.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      nextFolder: {
        message: 'Next folder',
        context: 'Indicates navigation to the next folder and its contents.',
      },
    },
  };

</script>
