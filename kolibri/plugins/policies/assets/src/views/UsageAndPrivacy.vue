<template>

  <ImmersivePage
    :title="coreString('usageAndPrivacyLabel')"
    @cancel="$emit('cancel')"
  >
    <section v-if="!hideUsersSection">
      <h2>{{ coreString('usersLabel') }}</h2>
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
      <template v-if="oidcProviderEnabled">
        <h3>{{ $tr('openIdH1') }}</h3>
        <p>{{ $tr('openIdP1') }}</p>
      </template>
    </section>
    <section v-if="!hideOwnersSection">
      <h2>{{ $tr('kolibriOwnersTitle') }}</h2>
      <p>{{ $tr('kolibriOwnersP1') }}</p>
      <p>{{ $tr('kolibriOwnersP2') }}</p>
      <p>{{ $tr('kolibriOwnersP3') }}</p>
      <p>{{ $tr('kolibriOwnersP4') }}</p>
    </section>
    <section v-if="!hideAboutSection">
      <h2>{{ $tr('kolibriAboutTitle') }}</h2>
      <p>{{ $tr('kolibriAboutP1') }}</p>
      <p>
        <KExternalLink
          text="https://learningequality.org"
          href="https://learningequality.org"
          :openInNewTab="true"
        />
      </p>
      <p>{{ $tr('kolibriAboutP2') }}</p>
      <p>{{ $tr('kolibriAboutP3') }}</p>
      <p>{{ $tr('kolibriAboutP4') }}</p>
      <p>{{ $tr('kolibriAboutP5') }}</p>
    </section>
    <template #actions>
      <!--
        Need to inject a button without type="submit" attribute
        so it doesn't force a submit event in the SetupWizard SuperuserCredentialsForm
      -->
      <KButton
        :text="coreString('closeAction')"
        primary
        @click="$emit('submit')"
      />
    </template>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import plugin_data from 'kolibri-plugin-data';

  export default {
    name: 'UsageAndPrivacy',
    components: { ImmersivePage },
    mixins: [commonCoreStrings],
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
    computed: {
      oidcProviderEnabled() {
        return plugin_data.oidcProviderEnabled;
      },
    },
    $trs: {
      kolibriUsersP1: {
        message:
          'You should use Kolibri in compliance with all applicable laws. This may mean obtaining permission from your parent, guardian, or teacher.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersP2: {
        message:
          'Be aware that your personal information may be visible to others, depending on how the software has been configured and how you access the software.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersP3: {
        message:
          "Please contact your local Kolibri administrator to understand what personal information of yours might be stored, who it's visible to, how to update or delete it, or if you believe your account has been compromised.",
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersP4: {
        message: 'You should not:',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersL1: {
        message:
          'Share your password, let anyone access your account, or do anything that might put your account at risk',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersL2: {
        message: "Attempt to access any other user's account",
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersL3: {
        message:
          'Remove, circumvent, disable, damage or otherwise interfere with security-related features of Kolibri',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersL4: {
        message:
          "Intentionally interfere with or damage the operation of Kolibri or any user's enjoyment of it, by any means",

        context: 'Part of the "Usage and privacy" recommendations.',
      },
      kolibriUsersP5: {
        message:
          'When you use Kolibri as a logged-in user, information such as your name, username, age, birth year, identification number, the resources that you view, and your performance on assessments may be made available to administrators and coaches in your facility. Your information may also be used by the developers of Kolibri and shared with content creators to help improve the software and resources for different learner types and needs.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriUsersP6: {
        message:
          'When you use Kolibri as a guest, aggregate information about the resources you and other guest users view may be available to administrators and certain coaches.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriOwnersTitle: {
        message: 'Administrators',
        context:
          'Title of a section in the \'Usage and privacy\' information panel. The section contains information about for administrators who are running and maintaining Kolibri.\n\nYou can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriOwnersP1: {
        message:
          'You should run Kolibri as a service in compliance with all applicable laws. If you are the owner of the device that Kolibri is installed on, please be aware that you are ultimately responsible for the safety and protection of the user data that gets stored in Kolibri.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriOwnersP2: {
        message:
          "You should also follow best information security practices for protecting your users' data. This includes keeping the device physically secure, encrypting the hard drive, using strong and unique passwords, keeping the operating system up-to-date, and having a properly-configured firewall.",
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriOwnersP3: {
        message:
          'If you choose to sync your facility data to the Kolibri Data Portal, you would be granting Kolibri Data Portal organization administrators access to your data. You would also be granting access to Learning Equality, who operates the servers.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriOwnersP4: {
        message:
          'Please ensure that your users have way of getting in touch with you if they have concerns about their accounts.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriAboutTitle: {
        message: 'About Kolibri',
        context:
          "Title of a section in the 'Usage and privacy' information panel. The section contains information about Kolibri.\n\nYou can access the full text via the 'Usage and privacy' link in the left navigation bar.\n",
      },
      kolibriAboutP1: {
        message:
          "The Kolibri software is built by Foundation for Learning Equality, Inc. More information, including Kolibri's Terms of Service and Privacy Policy, can be found at:",
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriAboutP2: {
        message:
          'Kolibri is a software application that can be installed on a wide variety of devices without needing a connection to the internet.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriAboutP3: {
        message:
          'Unlike many online web services that are similarly accessed through a web browser, there are thousands of independent Kolibri installations around the world – including this one. Each Kolibri installation is managed and controlled by the owner of the device that it is installed on.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriAboutP4: {
        message:
          'It is also possible for administrators to sync Kolibri data to the cloud-based Kolibri Data Portal service. If this occurs, all facility data will be accessible to organization admins on Kolibri Data Portal. It will be uploaded to cloud servers operated by Learning Equality, who will also have access to this data.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      kolibriAboutP5: {
        message:
          'In order to improve the quality of Kolibri and the resources on it, Learning Equality collects anonymized usage information when Kolibri has access to the internet. This includes IP addresses associated with the server, and device details such as the operating system and time zone. We also collect aggregate statistics including: number of users and facilities, birth year and gender distribution, and resource popularity. We make every effort to avoid collecting personally identifying information about Kolibri users.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      openIdH1: {
        message: 'Signing in to third-party applications using Kolibri',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
      openIdP1: {
        message:
          'It is possible to use Kolibri to register or sign in to third-party applications. If you do this, the other application will have access to your Kolibri username, unique user ID, and full name.',
        context:
          'This text forms part of the \'Usage and privacy\' information panel in Kolibri. You can access the full text via the "Usage and privacy" link in the left navigation bar.',
      },
    },
  };

</script>
