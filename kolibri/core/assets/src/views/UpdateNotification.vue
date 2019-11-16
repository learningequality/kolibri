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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { mapGetters, mapActions, mapMutations } from 'vuex';

  export default {
    name: 'UpdateNotification',
    mixins: [commonCoreStrings],
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
      hideNotificationLabel: "Don't show this message again",
      // The strings below are not actually used in the appplication code.
      // They are included simply to get the strings translated for later use. We should do
      // this differently in the longer-term to ensure that we have broader language support.
      /* eslint-disable kolibri/vue-no-unused-translations */
      upgradeHeader: 'Upgrade available',
      upgradeHeaderImportant: 'Important upgrade available',
      upgradeMessageGeneric: 'A new version of Kolibri is available.',
      upgradeMessageImportant:
        'We have released an important update with fixes to this version of Kolibri.',
      upgradeMessage0130:
        'Kolibri version 0.13.0 is available! It contains major improvements to resource management, coach tools, and much more.',
      upgradeDownload: 'Download it here',
      upgradeLearnAndDownload: 'Learn more and download it here',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>
