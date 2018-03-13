<template>

  <div>
    <h1>{{ $tr('exams') }}</h1>
    <div class="filter-and-button">
      <k-select
        :label="$tr('show')"
        :options="statusOptions"
        :inline="true"
        v-model="statusSelected"
      />
      <k-router-link
        :primary="true"
        appearance="raised-button"
        :to="newExamRoute"
        :text="$tr('newExam')"
      />
    </div>
    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('title') }}</th>
          <th>{{ $tr('recipients') }}</th>
          <th>
            {{ $tr('status') }}
            <core-info-icon
              :iconAriaLabel="$tr('statusDescription')"
              :tooltipText="$tr('statusTooltipText')"
              tooltipPosition="bottom right"
            />
          </th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr
          v-for="exam in filteredExams"
          :key="exam.id"
        >
          <td class="core-table-icon-col">
            <content-icon :kind="examIcon" />
          </td>

          <td class="core-table-main-col">
            <k-router-link
              :text="exam.title"
              :to="genExamRoute(exam.id)"
            />
          </td>

          <td> {{ genRecipientsString(exam.visibility) }} </td>

          <td>
            <status-icon :active="exam.active" />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-if="!exams.length">
      {{ $tr('noExams') }}
    </p>
    <p v-else-if="statusSelected.value === $tr('activeExams') && !activeExams.length">
      {{ $tr('noActiveExams') }}
    </p>
    <p v-else-if=" statusSelected.value === $tr('inactiveExams') && !inactiveExams.length">
      {{ $tr('noInactiveExams') }}
    </p>

    <change-exam-visibility-modal
      v-if="showChangeExamVisibilityModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :examVisibility="selectedExam.visibility"
      :classId="classId"
      :className="className"
      :classGroups="currentClassGroups"
    />
    <preview-exam-modal
      v-if="showPreviewExamModal"
      :examChannelId="selectedExam.channelId"
      :examQuestionSources="selectedExam.questionSources"
      :examSeed="selectedExam.seed"
      :examNumQuestions="selectedExam.questionCount"
    />
    <rename-exam-modal
      v-if="showRenameExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :classId="classId"
      :exams="sortedExams"
    />
    <delete-exam-modal
      v-if="showDeleteExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :classId="classId"
    />
  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { className } from '../../../state/getters/main';
  import * as ExamActions from '../../../state/actions/exam';
  import { Modals as ExamModals } from '../../../examConstants';
  import { PageNames } from '../../../constants';
  import orderBy from 'lodash/orderBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import changeExamVisibilityModal from './change-exam-visibility-modal';
  import previewExamModal from './preview-exam-modal';
  import renameExamModal from './rename-exam-modal';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import StatusIcon from '../../assignments/StatusIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'coachExamsPage',
    $trs: {
      exams: 'Exams',
      allExams: 'All exams',
      activeExams: 'Active exams',
      inactiveExams: 'Inactive exams',
      newExam: 'New exam',
      title: 'Title',
      recipients: 'Recipients',
      noExams: 'You do not have any exams',
      noActiveExams: 'No acitve exams',
      noInactiveExams: 'No inactive exams',
      show: 'Show',
      status: 'Status',
      statusDescription: 'Status description',
      statusTooltipText: 'Learners can only see active lessons',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody',
    },
    components: {
      CoreTable,
      kRouterLink,
      kSelect,
      changeExamVisibilityModal,
      previewExamModal,
      renameExamModal,
      CoreInfoIcon,
      contentIcon,
      StatusIcon,
    },
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
        selectedExam: {
          title: '',
          id: '',
          visibility: {
            class: null,
            groups: [],
          },
        },
      };
    },
    computed: {
      examIcon() {
        return ContentNodeKinds.EXAM;
      },
      sortedExams() {
        return orderBy(this.exams, [exam => exam.title.toUpperCase()], ['asc']);
      },
      sortedChannels() {
        return orderBy(this.channels, [channel => channel.name.toUpperCase()], ['asc']);
      },
      statusOptions() {
        return [
          { label: this.$tr('allExams'), value: this.$tr('allExams') },
          { label: this.$tr('activeExams'), value: this.$tr('activeExams') },
          { label: this.$tr('inactiveExams'), value: this.$tr('inactiveExams') },
        ];
      },
      activeExams() {
        return this.sortedExams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.sortedExams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.statusSelected.label;
        if (filter === this.$tr('activeExams')) {
          return this.activeExams;
        } else if (filter === this.$tr('inactiveExams')) {
          return this.inactiveExams;
        }
        return this.sortedExams;
      },
      showActivateExamModal() {
        return this.examsModalSet === ExamModals.ACTIVATE_EXAM;
      },
      showDeactivateExamModal() {
        return this.examsModalSet === ExamModals.DEACTIVATE_EXAM;
      },
      showChangeExamVisibilityModal() {
        return this.examsModalSet === ExamModals.CHANGE_EXAM_VISIBILITY;
      },
      showPreviewExamModal() {
        return this.examsModalSet === ExamModals.PREVIEW_EXAM;
      },
      showRenameExamModal() {
        return this.examsModalSet === ExamModals.RENAME_EXAM;
      },
      showDeleteExamModal() {
        return this.examsModalSet === ExamModals.DELETE_EXAM;
      },
      newExamRoute() {
        return { name: PageNames.CREATE_EXAM };
      },
    },
    methods: {
      setSelectedExam(examId) {
        Object.assign(this.selectedExam, this.sortedExams.find(exam => exam.id === examId));
      },
      openChangeExamVisibilityModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.CHANGE_EXAM_VISIBILITY);
      },
      openActivateExamModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.ACTIVATE_EXAM);
      },
      openDeactivateExamModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.DEACTIVATE_EXAM);
      },
      openPreviewExamModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.PREVIEW_EXAM);
      },
      routeToExamReport({ id, channelId }) {
        this.$router.push({
          name: PageNames.EXAM_REPORT,
          params: {
            classId: this.classId,
            examId: id,
            channelId,
          },
        });
      },
      openRenameExamModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.RENAME_EXAM);
      },
      openDeleteExamModal(examId) {
        this.setSelectedExam(examId);
        this.setExamsModal(ExamModals.DELETE_EXAM);
      },
      genExamRoute(examId) {
        return {
          name: PageNames.EXAM_REPORT,
          params: { examId },
        };
      },
      genRecipientsString(examVisibility) {
        if (examVisibility.class) {
          return this.$tr('entireClass');
        } else if (examVisibility.groups.length) {
          return this.$tr('groups', { count: examVisibility.groups.length });
        }
        return this.$tr('nobody');
      },
    },
    vuex: {
      actions: { setExamsModal: ExamActions.setExamsModal },
      getters: {
        classId: state => state.classId,
        className,
        currentClassGroups: state => state.pageState.currentClassGroups,
        exams: state => state.pageState.exams,
        channels: state => state.pageState.channels,
        examsModalSet: state => state.pageState.examsModalSet,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .filter-and-button
    display: flex
    flex-wrap: wrap-reverse
    justify-content: space-between
    button
      align-self: flex-end

  .center-text
    text-align: center

</style>
