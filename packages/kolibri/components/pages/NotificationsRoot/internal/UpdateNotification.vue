<template>

  <KModal
    size="large"
    :submitText="coreString('closeAction')"
    :title="title"
    @submit="submit"
  >
    <p>{{ msg }}</p>
    <p>
      <KExternalLink
        v-if="linkUrl"
        :href="linkUrl"
        :text="linkText || linkUrl"
        :openInNewTab="true"
      />
    </p>
    <p v-if="!isSuperuser">
      {{ $tr('adminMessage') }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'UpdateNotification',
    mixins: [commonCoreStrings],
    setup() {
      const { isSuperuser } = useUser();
      return { isSuperuser };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      msg: {
        type: String,
        required: true,
      },
      linkText: {
        type: String,
        default: null,
      },
      linkUrl: {
        type: String,
        default: null,
      },
    },
    methods: {
      submit() {
        this.$emit('submit');
      },
    },
    $trs: {
      adminMessage: {
        message: 'Please contact the device administrator for this server',
        context: 'Prompt telling the user to contact the device admin.',
      },
      // The strings below are not actually used in the appplication code.
      // They are included simply to get the strings translated for later use. We should do
      // this differently in the longer-term to ensure that we have broader language support.
      /* eslint-disable kolibri/vue-no-unused-translations */
      upgradeHeader: {
        message: 'Upgrade available',
        context: 'Indicates that a new version of Kolibri is available.',
      },
      upgradeHeaderImportant: {
        message: 'Important upgrade available',
        context: 'Indicates that an important new version of Kolibri is available.',
      },
      upgradeMessageGeneric: {
        message: 'A new version of Kolibri is available.',
        context: 'Notification indicating a new version of Kolibri is available.',
      },
      upgradeMessageImportant: {
        message: 'We have released an important update with fixes to this version of Kolibri.',
        context: 'Notification indicating an important new version of Kolibri is available.',
      },
      upgradeMessage_0_18_0: {
        message:
          'Kolibri version 0.18.0 is available! New features include comprehensive search and filter within lesson and quiz creation, Bloom reader support, updated navigation in Coach, as well as bug fixes and improvements.',
        context: 'Notification indicating a new version of Kolibri is available.',
      },
      upgradeDownload: {
        message: 'Download it here',
        context:
          'When an upgrade of Kolibri is made available, this button allows the user to download it.',
      },
      upgradeLearnAndDownload: {
        message: 'Learn more and download it here',
        context:
          'Link which invites the user to find out more about a new version of Kolibri and shows them where to download it.',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>
