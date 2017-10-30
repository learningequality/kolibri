<template>

  <core-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    @cancel="close"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>

      <p>{{ $tr('description') }}</p>

      <!-- Button Section TODO: cleaunup -->
      <section>

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

      </section>

    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  export default {
    name: 'classDeleteModal',
    $trs: {
      modalTitle: 'Delete Class',
      delete: 'Delete Class',
      cancel: 'Cancel',
      description:
        'Users will only be removed from the class and are still accessible from the "Users" tab.',
      deleteConfirmation: 'Are you sure you want to delete { classname }?',
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
          classname: `<strong> ${this.classname} </strong>`,
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
        deleteClass: actions.deleteClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  section
    text-align: right

  .header
    text-align: center

  p
    word-break: keep-all

</style>
