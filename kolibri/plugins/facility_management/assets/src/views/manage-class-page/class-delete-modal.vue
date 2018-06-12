<template>

  <k-modal
    :title="$tr('modalTitle')"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    :hasError="false"
    @submit="classDelete"
    @cancel="close"
  >
    <p>{{ $tr('confirmation', { classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';
  import { deleteClass, displayModal } from '../../state/actions';

  export default {
    name: 'classDeleteModal',
    $trs: {
      modalTitle: 'Delete class',
      delete: 'Delete class',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to delete '{ classname }'?",
      description:
        "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
    },
    components: {
      kModal,
    },
    props: {
      classname: {
        type: String,
        required: true,
      },
      classid: {
        type: String,
        required: true,
      },
    },
    methods: {
      classDelete() {
        this.deleteClass(this.classid);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        deleteClass,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  p
    word-break: keep-all

</style>
