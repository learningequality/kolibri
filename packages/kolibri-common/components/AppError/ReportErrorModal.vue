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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import TechnicalTextBlock from './TechnicalTextBlock';

  export default {
    name: 'ReportErrorModal',
    components: {
      TechnicalTextBlock,
    },
    mixins: [commonCoreStrings],
    props: {
      error: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        // TODO Set offline variable via ping in mounted()?
        // Or via computed prop
        offline: false,
      };
    },
    computed: {
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
      reportErrorHeader: {
        message: 'Report Error',
        context: 'Title of the window where the user can report an error.',
      },
      forumPrompt: {
        message: 'Visit the community forums',
        context:
          'If a user spots an error in Kolibri, this prompt links through to the Kolibri community forums where they can also report errors or search for similar issues.',
      },
      // reall long
      forumUseTips: {
        message:
          'Search the community forum to see if others encountered similar issues. If unable to find anything, paste the error details below into a new forum post so we can rectify the error in a future version of Kolibri.',
        context:
          'If a user spots an error in Kolibri, this text indicates that in Kolibri community forums they can also report errors or search for similar issues.',
      },
      forumPostingTips: {
        message:
          'Include a description of what you were trying to do and what you clicked on when the error appeared.',
        context:
          'Helper text for the user when describing the details of the error they saw in their email to the development team.\n',
      },
      emailPrompt: {
        message: 'Send an email to the developers',
        context:
          'Users can send an email to the Kolibri development team indicating details about an error if they see one.',
      },
      emailDescription: {
        message: "Contact the support team with your error details and we'll do our best to help.",
        context:
          'This is a message that a user sees if they provoke an error in Kolibri. They can send an email to the Kolibri development team indicating further details about the error.',
      },
      errorDetailsHeader: {
        message: 'Error details',
        context:
          'Here the user would indicate the details of the error they saw in their email to the development team.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .error-detail-modal {
    text-align: left;
  }

</style>
