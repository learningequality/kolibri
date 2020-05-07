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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
      header: 'Permissions change',
      superAdminMessage1: 'Your role has been changed to Super Admin.',
      superAdminMessage2:
        'You can now manage channels and the permissions of other users. Learn morein the Permissions tab.',
      manageContentMessage1: 'You have been given permissions to manage content on this device.',
    },
  };

</script>


<style lang="scss" scoped>

  .paragraph {
    margin-top: 16px;
  }

</style>
