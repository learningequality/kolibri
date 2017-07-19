<template>

  <core-modal :title="$tr('activateExam')" @cancel="close">
    <p>
      <span v-html="$trHtml('areYouSure', { examTitle })"></span>
      {{ $tr('willBeVisible') }}
    </p>
    <p>
      <span v-if="examVisibility.class"><strong>{{ $tr('entireClass') }}</strong></span>
      <span v-else>
        <ul>
          <li v-for="group in examVisibility.groups"><strong>{{ group.collection.name }}</strong></li>
        </ul>
      </span>
    </p>
    <div class="footer">
      <icon-button :text="$tr('cancel')" :raised="false" @click="close"/>
      <icon-button :text="$tr('activate')" :primary="true" @click="activateExam(examId)"/>
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    $trNameSpace: 'activateExamModal',
    $trs: {
      activateExam: 'Activate exam',
      areYouSure: 'Are you sure you want to activate <strong>{ examTitle }</strong>?',
      willBeVisible: 'The exam will be visible to the following:',
      cancel: 'Cancel',
      activate: 'Activate',
      entireClass: 'Entire class',
    },
    components: {
      coreModal,
      iconButton,
    },
    props: {
      examId: {
        type: String,
        required: true,
      },
      examTitle: {
        type: String,
        required: true,
      },
      examVisibility: {
        type: Object,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
    },
    methods: {
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
        activateExam: examActions.activateExam,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: center
    button
      min-width: 45%

</style>
