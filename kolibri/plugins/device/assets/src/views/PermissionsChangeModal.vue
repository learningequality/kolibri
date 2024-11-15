<template>

  <KModal
    :title="$tr('header')"
    :submitText="coreString('continueAction')"
    @submit="$emit('submit')"
  >
    <p
      v-for="(paragraph, idx) in paragraphs"
      :key="idx"
      class="paragraph"
    >
      {{ paragraph }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'PermissionsChangeModal',
    mixins: [commonCoreStrings],
    props: {
      newRole: {
        type: String,
        required: true,
      },
    },
    computed: {
      paragraphs() {
        if (this.newRole === 'superadmin') {
          return [this.$tr('superAdminMessage1'), this.$tr('superAdminMessage2')];
        } else {
          return [this.$tr('manageContentMessage1')];
        }
      },
    },
    render: createElement => window.setTimeout(createElement, 750),
    $trs: {
      header: {
        message: 'Your permissions have changed',
        context: 'Modal window title',
      },
      superAdminMessage1: {
        message: 'Your role has been changed to Super Admin.',
        context:
          "Description of permission. This window displays if a user's permissions are changed.",
      },
      superAdminMessage2: {
        message:
          'You can now manage channels and the permissions of other users. Learn more in the Permissions tab.',
        context:
          "Description of permission. This window displays if a user's permissions are changed.",
      },
      manageContentMessage1: {
        message: 'You have been given permissions to manage channels and resources on this device.',
        context:
          "Description of permission. This window displays if a user's permissions are changed.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .paragraph {
    margin-top: 16px;
  }

</style>
