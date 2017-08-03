<template>

  <core-modal
    :title="$tr('addNewClassTitle')"
    @cancel="close"
  >
    <div>
      <form @submit.prevent="createNewClass">
        <k-textbox
          :label="$tr('classname')"
          :aria-label="$tr('classname')"
          v-model.trim="name"
          :autofocus="true"
          :required="true"
          :invalid="duplicateName"
          :error="$tr('duplicateName')"
          type="text"
        />

        <section class="footer">
          <k-button
            type="button"
            :text="$tr('cancel')"
            :raised="false"
            @click="close"
          />

          <k-button
            type="submit"
            :text="$tr('create')"
            :primary="true"
          />
        </section>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  export default {
    name: 'classCreateModal',
    $trs: {
      addNewClassTitle: 'Add New Class',
      classname: 'Class Name',
      cancel: 'Cancel',
      create: 'Create',
      duplicateName: 'A class with that name already exists',
    },
    components: {
      kButton,
      coreModal,
      kTextbox,
    },
    props: {
      classes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return { name: '' };
    },
    computed: {
      duplicateName() {
        const index = this.classes.findIndex(
          classroom => classroom.name.toUpperCase() === this.name.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
    },
    methods: {
      createNewClass() {
        if (!this.duplicateName) {
          this.createClass(this.name);
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        createClass: actions.createClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

</style>
