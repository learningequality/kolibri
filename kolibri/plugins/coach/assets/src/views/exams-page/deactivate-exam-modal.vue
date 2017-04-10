<template>

  <core-modal :title="$tr('deactivateExam')" @cancel="close">
    <p>
      <span v-html="$trHtml('areYouSure', { examTitle })"></span>
      {{ $tr('noLongerVisible') }}
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
      <icon-button :text="$tr('deactivate')" :primary="true" @click="deactivateExam(examId)"/>
    </div>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'deactivateExamModal',
    $trs: {
      deactivateExam: 'Dectivate exam',
      areYouSure: 'Are you sure you want to deactivate <strong>{ examTitle }</strong>?',
      noLongerVisible: 'The exam will be no longer be visible to the following:',
      cancel: 'Cancel',
      deactivate: 'Deactivate',
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
        deactivateExam: examActions.deactivateExam,
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
