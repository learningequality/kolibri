<template>

  <KModal
    @cancel="$emit('cancel')"
    @submit="$emit('cancel')"
    size="medium"
    :cancelText="$tr('cancelButtonLabel')"
    :title="$tr('privacyModalHeader')"
  >
    <section>
      <h2>Kolibri users</h2>
      <p>
        You should use Kolibri in compliance with all
        applicable laws. This may mean obtaining permission
        from your parent, guardian, or teacher.
      </p>
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
      cancelButtonLabel: 'Close',
      privacyModalHeader: 'Usage and privacy',
      kolibriUsersTitle: 'Kolibri users',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
