<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p>
      <KExternalLink v-if="deviceContentUrl" :text="$tr('adminLink')" :href="deviceContentUrl" />
    </p>
    <p v-if="showLearnerText">
      {{ $tr('learnerText') }}
    </p>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import urls from 'kolibri.urls';

  export default {
    name: 'ContentUnavailablePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    computed: {
      ...mapGetters(['canManageContent', 'isLearner']),
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
      header: 'No resources available',
      adminLink: 'As an administrator, you can import channels',
      learnerText: 'Please ask your coach or administrator for assistance',
      documentTitle: {
        message: 'Content Unavailable',
        context: '\nThis string should actually say "Resource unavailable"',
      },
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
