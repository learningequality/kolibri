<template>

  <core-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    @cancel="close"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>
      <p v-html="formattedAccessReassuranceConfirmation"> </p>

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="close"
        />
        <k-button
          :text="$tr('delete')"
          :primary="true"
          @click="classDelete"
        />
      </div>

    </div>
  </core-modal>

</template>


<script>

  import { deleteClass, displayModal } from '../../state/actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';

  function bold(stringToBold) {
    return `<strong v-html> ${stringToBold} </strong>`;
  }

  export default {
    name: 'classDeleteModal',
    $trs: {
      modalTitle: 'Delete Class',
      delete: 'Delete Class',
      cancel: 'Cancel',
      deleteConfirmation: 'Are you sure you want to delete { classname }?',
      accessReassurance:
        'Enrolled users will be removed from the class but still accessible from the { sectionTabName } tab.',
      usersTab: 'Users',
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
      classid: {
        type: String,
        required: true,
      },
    },
    computed: {
      formattedDeleteConfirmation() {
        return this.$tr('deleteConfirmation', {
          classname: bold(this.classname),
        });
      },
      formattedAccessReassuranceConfirmation() {
        return this.$tr('accessReassurance', {
          sectionTabName: bold(this.$tr('usersTab')),
        });
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
