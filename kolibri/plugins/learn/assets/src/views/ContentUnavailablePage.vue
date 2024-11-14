<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <h1>{{ $tr('header') }}</h1>
    <p>
      <KExternalLink
        v-if="deviceContentUrl"
        :text="$tr('adminLink')"
        :href="deviceContentUrl"
      />
    </p>
    <p v-if="showLearnerText">
      {{ $tr('learnerText') }}
    </p>
  </LearnAppBarPage>

</template>


<script>

  import urls from 'kolibri/urls';
  import useUser from 'kolibri/composables/useUser';
  import LearnAppBarPage from './LearnAppBarPage';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'ContentUnavailablePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      LearnAppBarPage,
    },
    mixins: [commonLearnStrings],
    setup() {
      const { canManageContent, isLearner } = useUser();
      return {
        canManageContent,
        isLearner,
      };
    },
    computed: {
      deviceContentUrl() {
        const deviceContentUrl = urls['kolibri:kolibri.plugins.device:device_management'];
        if (deviceContentUrl && this.canManageContent) {
          return `${deviceContentUrl()}#/content`;
        }

        return '';
      },
      showLearnerText() {
        return this.isLearner && !this.canManageContent;
      },
    },
    $trs: {
      header: {
        message: 'No resources available',
        context:
          'Message displayed when there are no learning resources available for the learner to view.',
      },
      adminLink: {
        message: 'Import channels to your device',
        context: 'Message for admin indicating the possibility of importing channels into Kolibri.',
      },
      learnerText: {
        message: 'Ask your coach or administrator for assistance',
        context:
          "Description on the 'No resources available' page. A learner will see this if no resource have been assigned to them.",
      },
      documentTitle: {
        message: 'Resource unavailable',
        context:
          'Message displays if a resource has been removed or is not available for some other reason.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
