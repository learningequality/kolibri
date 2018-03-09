<template>

  <tr>
    <td class="core-table-icon-col">
      <content-icon :kind="examIcon" />
    </td>

    <td class="core-table-main-col">
      <k-router-link
        :text="examTitle"
        :to="examRoute"
      />
    </td>

    <td>{{ recipients }}</td>

    <td>
      <status-icon :active="examActive" />
    </td>
  </tr>

</template>


<script>

  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import StatusIcon from '../../assignments/StatusIcon';
  import { PageNames } from '../../../constants';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'examRow',
    $trs: {
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody',
    },
    components: {
      contentIcon,
      kRouterLink,
      StatusIcon,
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
      examActive: {
        type: Boolean,
        required: true,
      },
      examVisibility: {
        type: Object,
        required: true,
      },
    },
    computed: {
      examIcon() {
        return ContentNodeKinds.EXAM;
      },
      recipients() {
        if (this.examVisibility.class) {
          return this.$tr('entireClass');
        } else if (this.examVisibility.groups.length) {
          return this.$tr('groups', { count: this.examVisibility.groups.length });
        }
        return this.$tr('nobody');
      },
      examRoute() {
        return {
          name: PageNames.EXAM_REPORT,
          params: { examId: this.examId },
        };
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
