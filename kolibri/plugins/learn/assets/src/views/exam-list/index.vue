<template>

  <div>
    <page-header :title="$tr('examName')">
      <mat-svg slot="content-icon" category="action" name="assignment"/>
    </page-header>
    <p>{{ $tr('assignedTo', { assigned: activeExams }) }}</p>
    <div v-for="exam in exams">
      <mat-svg slot="content-icon" category="action" name="assignment"/>{{ exam.title }}
      <div v-if="exam.closed || !exam.active">
        {{ $tr('howManyCorrect', { score: exam.score, outOf: exam.questionCount })}}
        <b>{{ $tr('percentCorrect', { pct: exam.score/exam.questionCount })}}</b>
      </div>
      <div v-else>
        <p v-if="exam.answerCount !== null">
          {{ $tr('questionsLeft', { left: exam.questionCount - exam.answerCount }) }}
        </p>
        <button>
          <router-link :to="generateExamLink(exam.id)">
            {{ exam.answerCount !== null ? $tr('continue') : $tr('start') }}
          </router-link>
        </button>
      </div>
    </div>
  </div>

</template>


<script>

  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;
  const PageNames = require('../../constants').PageNames;

  module.exports = {
    $trNameSpace: 'examIndex',
    $trs: {
      examName: 'Exams',
      howManyCorrect: '{ score, number }/{ outOf, number } correct',
      percentCorrect: '{pct, number, percent}',
      questionsLeft: '{ left, number } questions left',
      continue: 'Continue',
      start: 'Start',
      assignedTo: 'You have { assigned } {assigned, plural, one {exam} other {exams} } assigned',
    },
    components: {
      'page-header': require('../page-header'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => !exam.closed || exam.active).length;
      }
    },
    methods: {
      generateExamLink(id) {
        return {
          name: PageNames.EXAM_ROOT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        exams: state => state.pageState.exams,
        channelId: (state) => getCurrentChannelObject(state).id,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
