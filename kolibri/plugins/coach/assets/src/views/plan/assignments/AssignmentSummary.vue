<template>

  <div>
    <div class="lesson-summary-header">
      <div class="lesson-summary-header-title-block">
        <h1 class="lesson-summary-header-title" dir="auto">
          <KLabeledIcon>
            <KIcon slot="icon" lesson />
            {{ title }}
          </KLabeledIcon>
        </h1>
      </div>
      <slot name="optionsDropdown"></slot>
    </div>

    <HeaderTable>
      <HeaderTableRow>
        <template slot="key" class="term" :style="{ color: $coreTextAnnotation }">
          {{ $tr('status') }}
          <CoreInfoIcon
            :iconAriaLabel="$tr('statusDescription')"
            :tooltipText="tooltipText"
          />
        </template>
        <template slot="value" class="description">
          <LessonActive v-if="kind==='lesson'" :active="active" />
          <QuizActive v-else :active="active" />
          <KButton
            appearance="basic-link"
            class="change-status-button"
            :text="$tr('changeStatus')"
            @click="$emit('changeStatus')"
          />
        </template>
      </HeaderTableRow>

      <HeaderTableRow v-if="showDescription">
        <template slot="key" class="term" :style="{ color: $coreTextAnnotation }">
          {{ $tr('description') }}
        </template>
        <template slot="value" dir="auto">
          {{ description || $tr('noDescription') }}
        </template>
      </HeaderTableRow>

      <HeaderTableRow>
        <template slot="key" class="term" :style="{ color: $coreTextAnnotation }">
          {{ $tr('assignedGroupsListLabel') }}
        </template>
        <template slot="value" class="description">
          <template v-if="!recipients.length">
            {{ this.$tr('noOne') }}
          </template>
          <template v-else-if="classIsTheRecipient">
            {{ this.$tr('entireClass') }}
          </template>
          <ul
            v-else
            class="group-list"
          >
            <li
              v-for="recipientGroup in recipientGroups"
              :key="recipientGroup.id"
              class="group-list-item"
            >
              <span dir="auto">{{ recipientGroup.name }}</span>
            </li>
          </ul>
        </template>
      </HeaderTableRow>
    </HeaderTable>

  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import { CollectionKinds, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import LessonActive from '../../common/LessonActive';
  import QuizActive from '../../common/QuizActive';

  export default {
    name: 'AssignmentSummary',
    components: {
      CoreInfoIcon,
      LessonActive,
      QuizActive,
      KButton,
      KIcon,
      KLabeledIcon,
      HeaderTable,
      HeaderTableRow,
    },
    mixins: [themeMixin],
    props: {
      kind: {
        type: String,
        required: true,
      },
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
      showDescription() {
        return this.description !== null;
      },
      normalizedRecipients() {
        return this.recipients.map(recipient => {
          return Object.assign({}, recipient, {
            collection_id:
              recipient.collection_id || recipient.collection.id || recipient.collection,
            collection_kind: recipient.collection_kind || recipient.collection.kind,
          });
        });
      },
      classIsTheRecipient() {
        return (
          this.normalizedRecipients.length === 1 &&
          this.normalizedRecipients[0].collection_kind === CollectionKinds.CLASSROOM
        );
      },
      recipientGroups() {
        return this.normalizedRecipients
          .filter(recipient => recipient.collection_kind === CollectionKinds.LEARNERGROUP)
          .map(recipientGroup => {
            recipientGroup.name = this.groups.find(
              lg => lg.id === recipientGroup.collection_id
            ).name;
            return recipientGroup;
          });
      },
      tooltipText() {
        if (this.kind === ContentNodeKinds.EXAM) {
          return this.$tr('statusTooltipTextExams');
        }
        if (this.kind === ContentNodeKinds.LESSON) {
          return this.$tr('statusTooltipTextLessons');
        }

        return '';
      },
    },
    $trs: {
      status: 'Status',
      statusDescription: 'Status description',
      statusTooltipTextExams: 'Learners can only see active quizzes',
      statusTooltipTextLessons: 'Learners can only see active lessons',
      changeStatus: 'Change',
      description: 'Description',
      noDescription: 'No description',
      assignedGroupsListLabel: 'Visible to',
      noOne: 'No one',
      entireClass: 'Entire class',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../common/definitions';

  $table-header-size: 12px;

  // TODO use classes
  .term {
    margin-top: 16px;
    margin-bottom: 8px;
    font-size: $table-header-size;
  }

  .description {
    margin-bottom: 1.5em;
    margin-left: 0;
  }

  .group-list {
    padding: 0;
    margin: 0;
  }

  .group-list-item {
    display: inline;
    margin: 0;
    list-style: none;
    &:not(:last-child)::after {
      content: ', ';
    }
  }

  .title-lesson-icon {
    display: inline-block;
    margin-right: 0.5em;
    font-size: 1.8em;
    /deep/ .ui-icon {
      vertical-align: bottom;
    }
  }

  .change-status-button {
    margin-left: 1.5em;
  }

  .lesson-summary-header {
    @extend %with-flushed-button;
  }

  .lesson-summary-header-title {
    display: inline-block;
  }

</style>
