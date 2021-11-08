<template>

  <div>
    <!-- TODO Delete this component, the strings should live in different
    namespaces in the next release - this is here to be crossComponentTranslated
    until the next batch of translations -->
  </div>

</template>


<script>

  /* I really wanted to rename this component to differentiate the UI cases
    between when viewing the resource or browsing them and did not have enough
    of the data structure to reliably build a solution that would render both
    views.

    So now this component just supplies strings until the next go round.
  */

  export default {
    name: 'SidePanelResourceMetadata',
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      author: {
        message: 'Author',
        context:
          'Indicates who is the author of that specific learning resource. For example, "Author: Learning Equality".',
      },
      license: {
        message: 'License',
        context:
          'Indicates the type of license of that specific learning resource. For example, "License: CC BY-NC-ND".\n',
      },
      toggleLicenseDescription: {
        message: 'Toggle license description',
        context:
          'Describes the arrow which a learner can select to view more information about the type of license that a resource has.',
      },
      copyrightHolder: {
        message: 'Copyright holder',
        context:
          'Indicates who holds the copyright of that specific learning resource. For example, "Copyright holder: Ubongo Media".',
      },
      language: {
        message: 'Language',
        context: 'Users can filter learning resources by language (e.g. Spanish, German)',
      },
      level: {
        message: 'Level',
        context: 'Refers to the level of education to which the resource is directed at.',
      },
      estimatedTime: {
        message: 'Estimated time',
        context: 'Refers to the expected time it will take the learner to complete a resource.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      documentTitle: {
        message: '{ contentTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      shareFile: {
        message: 'Share',
        context: 'Option to share a specific file from a learning resource.',
      },
      locationsInChannel: {
        message: 'Location in {channelname}',
        context:
          "When there are multiple instances of the same resource, learner can see their 'locations' (positions in the respective folders of the channel) at the bottom of the sidebar with all the metadata, when they select the resource in the Kolibri Library.",
      },
      viewResource: {
        message: 'View resource',
        context: 'Refers to a button where the user can view all the details for a resource.',
      },
      showMore: {
        message: 'Show more',
        context: '',
      },
      showLess: {
        message: 'Show less',
        context: '',
      },
      whatYouWillNeed: {
        message: 'What you will need',
        context: '',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped></style>
