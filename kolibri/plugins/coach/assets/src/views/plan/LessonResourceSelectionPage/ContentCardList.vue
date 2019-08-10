<template>

  <div>
    <ul class="content-list">
      <KCheckbox
        v-if="showSelectAll"
        :label="$tr('selectAllCheckboxLabel')"
        :checked="selectAllChecked"
        :indeterminate="selectAllIndeterminate"
        @change="$emit('changeselectall', $event)"
      />
      <li
        v-for="content in contentList"
        :key="content.id"
        class="content-list-item"
      >
        <KCheckbox
          v-if="contentHasCheckbox(content)"
          class="content-checkbox"
          :label="content.title"
          :showLabel="false"
          :checked="contentIsChecked(content)"
          :indeterminate="contentIsIndeterminate(content)"
          @change="handleCheckboxChange(content.id, $event)"
        />
        <LessonContentCard
          :class="{'with-checkbox': needCheckboxes}"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :description="content.description"
          :kind="content.kind"
          :message="contentCardMessage(content)"
          :link="contentCardLink(content)"
          :numCoachContents="content.num_coach_contents"
        />
      </li>
    </ul>

    <template>
      <KButton
        v-if="showButton"
        :text="coreString('viewMoreAction')"
        :primary="false"
        @click="$emit('moreresults')"
      />
      <KCircularLoader
        v-if="viewMoreButtonState === 'waiting'"
        :delay="false"
      />
      <!-- TODO introduce messages in next version -->
      <p v-else-if="viewMoreButtonState === 'error'">
        <mat-svg category="alert" name="error" />
        <!-- {{ $tr('moreResultsError') }} -->
      </p>
      <!-- <p v-else-if="viewMoreButtonState === 'no_more_results'">
        {{ $tr('noMoreResults') }}
      </p> -->
    </template>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LessonContentCard from './LessonContentCard';

  export default {
    name: 'ContentCardList',
    components: {
      LessonContentCard,
    },
    mixins: [commonCoreStrings],
    props: {
      showSelectAll: {
        type: Boolean,
        default: false,
      },
      viewMoreButtonState: {
        type: String,
        required: true,
      },
      selectAllChecked: {
        type: Boolean,
        default: false,
      },
      selectAllIndeterminate: {
        type: Boolean,
        default: false,
      },
      contentList: {
        type: Array,
        required: true,
      },
      // Function that returns true if content item checkbox is checked
      contentIsChecked: {
        type: Function, // ContentNode => Boolean
        required: true,
      },
      // Function that returns true if content item checkbox is indeterminate
      contentIsIndeterminate: {
        type: Function, // ContentNode => Boolean
        required: false,
        default: () => false,
      },
      // Function that returns true if content item needs a checkbox
      contentHasCheckbox: {
        type: Function, // ContentNode => Boolean
        required: true,
      },
      // Function that returns a string that appears in the corner of the card
      contentCardMessage: {
        type: Function, // ContentNode => String
        required: true,
      },
      // Function that returns a route object to which the card navigates
      contentCardLink: {
        type: Function, // ContentNode => Route
        required: true,
      },
    },
    computed: {
      showButton() {
        return (
          this.viewMoreButtonState !== 'waiting' && this.viewMoreButtonState !== 'no_more_results'
        );
      },
      needCheckboxes() {
        return this.contentList.some(c => this.contentHasCheckbox(c));
      },
    },
    methods: {
      handleCheckboxChange(contentId, checked) {
        this.$emit('change_content_card', { contentId, checked });
      },
    },
    $trs: {
      selectAllCheckboxLabel: 'Select all',
      // noMoreResults: 'No more results',
      // moreResultsError: 'Failed to get more results',
    },
  };

</script>


<style lang="scss" scoped>

  @import './LessonContentCard/card';

  .content-list {
    display: block;
    padding: 0;
    list-style: none;
  }

  .content-list-item {
    position: relative;
    display: block;
    text-align: right;
  }

  .content-checkbox {
    position: absolute;
    top: 34%; // offset accouting for shadow on card
    left: 0;
    display: inline-block;
  }

  .with-checkbox {
    margin-left: $checkbox-offset;
  }

</style>
