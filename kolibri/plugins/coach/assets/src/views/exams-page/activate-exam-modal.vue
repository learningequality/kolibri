<template>

  <core-modal :title="$tr('activateExam')" @cancel="close">
    <p>
      <span v-html="$trHtml('areYouSure', { examTitle })"></span>
      {{ $tr('willBeVisible') }}
    </p>
    <p>
      <span v-if="examVisibility.class"><strong>Entire class</strong></span>
      <span v-else>
        <ul>
          <li v-for="group in examVisibility.groups"><strong>{{ group.name }}</strong></li>
        </ul>
      </span>
    </p>
    <div class="footer">
      <icon-button :text="$tr('cancel')" @click="close"/>
      <icon-button :text="$tr('activate')" :primary="true" @click="activateExam(examId)"/>
    </div>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'activateExamModal',
    $trs: {
      activateExam: 'Activate exam',
      areYouSure: 'Are you sure you want to activate <strong>{ examTitle }</strong>?',
      willBeVisible: 'The exam will be visible to the following:',
      cancel: 'Cancel',
      activate: 'Activate',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
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
