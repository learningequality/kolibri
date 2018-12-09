<template>

  <KModal
    size="large"
    :cancelText="$tr('cancelButtonLabel')"
    :title="$tr('privacyModalHeader')"
    @cancel="$emit('cancel')"
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
    <section v-if="!hideOwnersSection">
      <h2>{{ $tr('kolibriOwnersTitle') }}</h2>
      <p>{{ $tr('kolibriOwnersP1') }}</p>
      <p>{{ $tr('kolibriOwnersP2') }}</p>
      <p>{{ $tr('kolibriOwnersP3') }}</p>
    </section>
    <section v-if="!hideAboutSection">
      <h2>{{ $tr('kolibriAboutTitle') }}</h2>
      <p>{{ $tr('kolibriAboutP1') }}</p>
      <p>
        <KExternalLink
          text="https://learningequality.org"
          href="https://learningequality.org"
          target="_blank"
        />
      </p>
      <p>{{ $tr('kolibriAboutP2') }}</p>
      <p>{{ $tr('kolibriAboutP3') }}</p>
      <p>{{ $tr('kolibriAboutP4') }}</p>
    </section>
  </KModal>

</template>


<script>

  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'PrivacyInfoModal',
    components: {
      KExternalLink,
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
      kolibriUsersTitle: 'Users',
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
      kolibriOwnersTitle: 'Administrators',
      kolibriOwnersP1:
        'You should run Kolibri as a service in compliance with all applicable laws. If you are the owner of the device that Kolibri is installed on, please be aware that you are ultimately responsible for the safety and protection of the user data that gets stored in Kolibri.',
      kolibriOwnersP2:
        'You should also follow best information security practices for protecting your users’ data. This includes keeping the device physically secure, encrypting the hard drive, using strong and unique passwords, keeping the operating system up-to-date, and having a properly-configured firewall.',
      kolibriOwnersP3:
        'Please ensure that your users have way of getting in touch with you if they have concerns about their accounts.',
      kolibriAboutTitle: 'About Kolibri',
      kolibriAboutP1:
        'The Kolibri software is built by Foundation for Learning Equality, Inc. More information, including Kolibri’s Terms of Service and Privacy Policy, can be found at:',
      kolibriAboutP2:
        'Kolibri is a software application that can be installed on a wide variety devices without needing a connection to the internet.',
      kolibriAboutP3:
        'Unlike many online web services that are similarly accessed through a web browser, there are thousands of independent Kolibri installations around the world – including this one. Each Kolibri installation is managed and controlled by the owner of the device that it is installed on.',
      kolibriAboutP4:
        'In order to improve the quality of Kolibri and the content on it, Learning Equality might collect anonymized usage information when Kolibri has access to the internet. This may include IP addresses associated with the server, device details such as the operating system and time zone, and aggregate statistics about the users and content.',
    },
  };

</script>
