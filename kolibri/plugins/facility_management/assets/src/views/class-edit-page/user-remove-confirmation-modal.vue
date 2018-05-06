<template>

  <core-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    @enter="confirmRemoval"
    @cancel="close"
  >
    <p>{{ $tr('confirmation', { username: username, classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>

    <div class="core-modal-buttons">
      <k-button
        :text="$tr('cancel')"
        appearance="flat-button"
        @click="close"
      />
      <k-button
        :text="$tr('remove')"
        :primary="true"
        @click="confirmRemoval"
      />
    </div>
  </core-modal>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import { displayModal } from '../../state/actions';

  export default {
    name: 'userRemoveModal',
    $trs: {
      modalTitle: 'Remove user',
      remove: 'Remove',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
      description: "You can still access this account from the 'Users' tab.",
    },
    components: {
      kButton,
      coreModal,
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
      confirmRemoval() {
        this.$emit('confirm');
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  p
    word-break: keep-all

</style>
