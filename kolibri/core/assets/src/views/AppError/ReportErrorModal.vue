<template>

  <KModal
    :title="$tr('reportErrorHeader')"
    :cancelText="coreString('closeAction')"
    class="error-detail-modal"
    size="large"
    @cancel="$emit('cancel')"
  >

    <section>
      <h3 v-if="offline">
        {{ $tr('forumPrompt') }}
      </h3>
      <p>{{ $tr('forumUseTips') }}</p>
      <p>{{ $tr('forumPostingTips') }}</p>
      <KExternalLink
        class="download-as-text-link"
        :text="forumLink"
        :href="forumLink"
      />
    </section>

    <!-- only when offline -->
    <section v-if="offline">
      <h3>{{ $tr('emailPrompt') }}</h3>
      <p>{{ $tr('emailDescription') }}</p>
      <!-- email link goes here. TODO Probably not an href? -->
      <KExternalLink
        :text="emailAddress"
        :href="emailAddressLink"
      />
    </section>

    <h3>
      {{ $tr('errorDetailsHeader') }}
    </h3>
    <TechnicalTextBlock
      :text="error"
      :maxHeight="240"
    />

  </KModal>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import TechnicalTextBlock from './TechnicalTextBlock';

  export default {
    name: 'ReportErrorModal',
    components: {
      TechnicalTextBlock,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        // TODO Set offline variable via ping in mounted()?
        // Or via computed prop
        offline: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      forumLink() {
        return 'https://community.learningequality.org/c/support/kolibri';
      },
      emailAddress() {
        return 'info@learningequality.org';
      },
      emailAddressLink() {
        return `mailto:${this.emailAddress}`;
      },
    },
    $trs: {
      reportErrorHeader: 'Report Error',
      forumPrompt: 'Visit the community forums',
      // reall long
      forumUseTips:
        'Search the community forum to see if others encountered similar issues. If unable to find anything, paste the error details below into a new forum post so we can rectify the error in a future version of Kolibri.',
      forumPostingTips:
        'Include a description of what you were trying to do and what you clicked on when the error appeared.',
      emailPrompt: 'Send an email to the developers',
      emailDescription:
        'Contact the support team with your error details and we’ll do our best to help.',
      errorDetailsHeader: 'Error details',
    },
  };

</script>


<style lang="scss" scoped>

  .error-detail-modal {
    text-align: left;
  }

</style>
