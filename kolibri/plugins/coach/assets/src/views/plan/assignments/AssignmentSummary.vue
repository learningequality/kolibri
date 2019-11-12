<template>

  <div>
    <h1 dir="auto">
      <KLabeledIcon icon="lesson" :label="title" />
    </h1>

    <HeaderTable>
      <HeaderTableRow :keyText="coachString('statusLabel')">
        <LessonActive slot="value" :active="active" />
      </HeaderTableRow>
      <HeaderTableRow :keyText="coachString('recipientsLabel')">
        <template slot="value">
          <Recipients
            :groupNames="groupNames"
            :hasAssignments="recipients.length > 0"
          />
        </template>
      </HeaderTableRow>
      <HeaderTableRow
        :keyText="coachString('descriptionLabel')"
        :valueText="description || coachString('descriptionMissingLabel')"
      />
    </HeaderTable>

  </div>

</template>


<script>

  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import Recipients from '../../common/Recipients';
  import LessonActive from '../../common/LessonActive';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  // This is actually only used on the LessonSummaryPage, so Assignment type is
  // implicitly 'lesson'
  export default {
    name: 'AssignmentSummary',
    components: {
      LessonActive,
      HeaderTable,
      HeaderTableRow,
      Recipients,
    },
    mixins: [coachStringsMixin],
    props: {
      title: {
        type: String,
        required: true,
      },
      active: {
        type: Boolean,
        required: true,
      },
      description: {
        type: String,
        required: false,
        default: null,
      },
      recipients: {
        type: Array,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
    },
    computed: {
      groupNames() {
        const names = [];
        this.recipients.forEach(r => {
          const match = this.groups.find(({ id }) => id === r.collection);
          if (match) {
            names.push(match.name);
          }
        });
        return names;
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
