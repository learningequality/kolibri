<template>

  <KModal
    v-if="displayed"
    size="large"
    :submitText="$tr('okButtonLabel')"
    :title="$tr('updateModalHeader')"
  >
    <p>{{ updateMessageByLang }}</p>
    <KExternalLink :href="link" :text="linkTextByLang" />
    <KCheckbox :label="$tr('hideNotificationLabel')" />

  </KModal>

</template>


<script>

  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';

  export default {
    name: 'UpdateNotification',
    components: {
      KCheckbox,
      KExternalLink,
      KModal,
    },
    data() {
      return {
        displayed: false,
      };
    },
    $trs: {
      updateModalHeader: 'Upgrade available',
      okButtonLabel: 'OK',
      hideNotificationLabel: "Don't show this message again",
    },
  };

</script>
