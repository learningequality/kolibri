<template>

  <k-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="$tr('cancel')"
    @submit="confirmRemoval"
    @cancel="close"
  >
    <p>{{ $tr('confirmation', { username: username, classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'UserRemoveModal',
    $trs: {
      modalTitle: 'Remove user',
      remove: 'Remove',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
      description: "You can still access this account from the 'Users' tab.",
    },
    components: {
      KModal,
    },
    props: {
      classname: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions(['displayModal']),
      confirmRemoval() {
        this.$emit('confirm');
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
