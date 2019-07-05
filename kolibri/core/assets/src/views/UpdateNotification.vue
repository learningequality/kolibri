<template>

  <KModal
    size="large"
    :submitText="$tr('closeButtonLabel')"
    :title="title"
    @submit="submit"
  >
    <p>{{ msg }}</p>
    <p>
      <KExternalLink
        v-if="linkUrl"
        :href="linkUrl"
        :text="linkText || linkUrl"
        target="_blank"
      />
    </p>
    <p v-if="!isSuperuser">
      {{ $tr('adminMessage') }}
    </p>
    <p>
      <KCheckbox
        :label="$tr('hideNotificationLabel')"
        :checked="dontShowNotificationAgain"
        @change="dontShowNotificationAgain = !dontShowNotificationAgain"
      />
    </p>
  </KModal>

</template>


<script>

  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import { mapGetters, mapActions, mapMutations } from 'vuex';

  export default {
    name: 'UpdateNotification',
    components: {
      KCheckbox,
      KExternalLink,
      KModal,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
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
        required: false,
      },
      linkUrl: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        dontShowNotificationAgain: false,
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
    },
    methods: {
      ...mapMutations({
        removeNotification: 'CORE_REMOVE_NOTIFICATION',
      }),
      ...mapActions(['saveDismissedNotification']),
      submit() {
        if (this.dontShowNotificationAgain) {
          this.dontShowNotificationAgain = false;
          this.saveDismissedNotification(this.id);
        }
        this.removeNotification(this.id);
        this.$emit('submit');
      },
    },
    $trs: {
      adminMessage: 'Please contact the device administrator for this server',
      closeButtonLabel: 'Close',
      hideNotificationLabel: "Don't show this message again",
      // The strings below are not actually used in the appplication code.
      // They are included simply to get the strings translated for later use. We should do
      // this differently in the longer-term to ensure that we have broader language support.
      upgradeHeader: 'Upgrade available',
      upgradeHeaderImportant: 'Important upgrade available',
      upgradeMessageGeneric: 'A new version of Kolibri is available.',
      upgradeMessageImportant:
        'We have released an important update with fixes to this version of Kolibri.',
      upgradeMessage0124:
        'Kolibri version 0.12.4 is now available! It contains important bug fixes and new Coach features.',
      upgradeDownload: 'Download it here',
      upgradeLearnAndDownload: 'Learn more and download it here',
    },
  };

</script>
