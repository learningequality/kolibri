<template>

  <KModal
    :title="$tr('welcomeModalHeader')"
    :submitText="coreString('continueAction')"
    @submit="$emit('submit')"
  >
    <p
      v-for="(paragraph, idx) in paragraphs"
      :key="idx"
      class="paragraph"
    >
      {{ paragraph }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'WelcomeModal',
    mixins: [commonCoreStrings],
    props: {
      importedFacility: {
        type: Object,
        default: null,
      },
    },
    computed: {
      paragraphs() {
        if (this.importedFacility) {
          return [
            this.$tr('postSyncWelcomeMessage1'),
            this.$tr('postSyncWelcomeMessage2', { facilityName: this.importedFacility.name }),
          ];
        } else {
          return [
            this.$tr('welcomeModalContentDescription'),
            this.$tr('welcomeModalPermissionsDescription'),
          ];
        }
      },
    },
    render: createElement => window.setTimeout(createElement, 750),
    $trs: {
      welcomeModalHeader: 'Welcome to Kolibri!',
      welcomeModalContentDescription:
        'The first thing you should do is import some resources from the Channels tab.',
      welcomeModalPermissionsDescription:
        'The super admin account you created during setup has special permissions to do this. Learn more in the Permissions tab later.',
      postSyncWelcomeMessage1:
        'The first thing you should do is import some channels to this device.',
      postSyncWelcomeMessage2: `The learner reports, lessons, and quizzes in '{facilityName}' will not display properly until you import the resources associated with them.`,
    },
  };

</script>


<style lang="scss" scoped>

  .paragraph {
    margin-top: 16px;
  }

</style>
