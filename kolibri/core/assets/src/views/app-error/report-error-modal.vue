<template>

  <k-modal
    :title="$tr('errorDetailsHeader')"
    :cancelText="$tr('closeErrorModalButtomPrompt')"
    class="error-detail-modal"
    @cancel="$emit('cancel')"
  >
    <code>
      {{ error || 'THIS IS AN ERROR' }}
    </code>

    <!-- break out into a new div?  -->
    <h2> {{ $tr('errorReportingDirectionsHeader') }} </h2>

    <h3> {{ $tr('forumPrompt') }} </h3>
    <p> {{ $tr('forumDescription') }} </p>
    <k-external-link
      :text="forumLink"
      :href="forumLink"
    />

    <h3> {{ $tr('emailPrompt') }} </h3>
    <p> {{ $tr('emailDescription') }} </p>
    <!-- email link goes here. Probably not an href? -->

    <div class="error-copying-options">
      <p>
        <k-button
          :primary="false"
          :text="$tr('copyToClipboardButtonPrompt')"
        />
      </p>
      <p>
        <k-button
          appearance="basic-link"
          :text="$tr('downloadAsTextPrompt')"
        />
      </p>
    </div>


  </k-modal>

</template>


<script>

  import { mapState } from 'vuex';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kModal from 'kolibri.coreVue.components.kModal';

  export default {
    name: 'reportErrorModal',
    $trs: {
      errorDetailsHeader: 'Error details',
      copyToClipboardButtonPrompt: 'Copy to clipboard',
      downloadAsTextPrompt: 'Or download as .text file',
      errorReportingDirectionsHeader: 'How to report your error',
      forumPrompt: 'Visit our community forums',
      // reall long
      forumDescription: 'filler',
      emailPrompt: 'Email us',
      emailDescription:
        "Contact our support team with your error details and we'll do our best to help.",
      closeErrorModalButtomPrompt: 'Close',
    },
    components: {
      kButton,
      kExternalLink,
      kModal,
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      forumLink() {
        return 'https://community.learningequality.org/c/support/kolibri';
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .error-detail-modal {
    text-align: left;
  }

</style>
