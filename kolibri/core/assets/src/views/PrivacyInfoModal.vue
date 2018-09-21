<template>

  <KModal
    @cancel="$emit('cancel')"
    size="large"
    :cancelText="$tr('cancelButtonLabel')"
    :title="$tr('privacyModalHeader')"
  >
    <section v-if="!hideUsersSection">
      <h2>{{ $tr('kolibriUsersTitle') }}</h2>
      <p>{{ $tr('kolibriUsersP1') }}</p>
      <p>{{ $tr('kolibriUsersP2') }}</p>
      <p>{{ $tr('kolibriUsersP3') }}</p>
      <p>{{ $tr('kolibriUsersP4') }}</p>
      <ul>
        <li>{{ $tr('kolibriUsersL1') }}</li>
        <li>{{ $tr('kolibriUsersL2') }}</li>
        <li>{{ $tr('kolibriUsersL3') }}</li>
        <li>{{ $tr('kolibriUsersL4') }}</li>
      </ul>
      <p>{{ $tr('kolibriUsersP5') }}</p>
      <p>{{ $tr('kolibriUsersP6') }}</p>
    </section>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'PrivacyInfoModal',
    components: {
      KModal,
    },
    props: {
      hideUsersSection: {
        type: Boolean,
        default: false,
      },
      hideOwnersSection: {
        type: Boolean,
        default: false,
      },
      hideAboutSection: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      privacyModalHeader: 'Usage and privacy',
      cancelButtonLabel: 'Close',
      kolibriUsersTitle: 'Kolibri users',
      kolibriUsersP1:
        'You should use Kolibri in compliance with all applicable laws. This may mean obtaining permission from your parent, guardian, or teacher.',
      kolibriUsersP2:
        'When you use Kolibri, please be aware that your personal information may be visible to others, depending on how the software has been configured and how you access the software.',
      kolibriUsersP3:
        'Please contact your local Kolibri administrator to understand what personal information of yours might be stored, who it’s visible to, how to update or delete it, or if you believe your account has been compromised.',
      kolibriUsersP4: 'You should not:',
      kolibriUsersL1:
        'Share your password, let anyone access your account, or do anything that might put your account at risk',
      kolibriUsersL2: "Attempt to access any other user's account",
      kolibriUsersL3:
        'Remove, circumvent, disable, damage or otherwise interfere with security-related features of Kolibri',
      kolibriUsersL4:
        'Intentionally interfere with or damage operation of Kolibri or any user’s enjoyment of it, by any means',
      kolibriUsersP5:
        'When you use Kolibri as a logged-in user, information such as your name, username, the content that you view, and your performance on assessments may be made available to administrators and certain coaches in your facility.',
      kolibriUsersP6:
        'When you use Kolibri as a guest, aggregate information about the content you and other guest users view may be available to administrators and certain coaches.',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
