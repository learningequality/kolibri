<template>

  <div>
    <ul class="content-list">
      <KCheckbox
        :label="$tr('selectAllCheckboxLabel')"
        v-if="showSelectAll"
        :checked="selectAllChecked"
        :indeterminate="selectAllIndeterminate"
        @change="$emit('changeselectall', $event)"
      />
      <li
        v-for="content in contentList"
        class="content-list-item"
        :key="content.id"
      >
        <KCheckbox
          v-if="!contentHasCheckbox(content)"
          class="content-checkbox"
          :label="content.title"
          :showLabel="false"
          :checked="contentIsChecked(content)"
          :indeterminate="contentIsIndeterminate(content)"
          @change="handleCheckboxChange(content.id, $event)"
        />
        <LessonContentCard
          class="content-card"
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
        :text="$tr('viewMoreButtonLabel')"
        @click="$emit('moreresults')"
        :primary="false"
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

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import LessonContentCard from './LessonContentCard';

  export default {
    name: 'ContentCardList',
    components: {
      KButton,
      KCheckbox,
      KCircularLoader,
      LessonContentCard,
    },
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
    },
    methods: {
      handleCheckboxChange(contentId, checked) {
        this.$emit('change_content_card', { contentId, checked });
      },
    },
    $trs: {
      selectAllCheckboxLabel: 'Select all',
      viewMoreButtonLabel: 'View more',
      // noMoreResults: 'No more results',
      // moreResultsError: 'Failed to get more results',
    },
  };

</script>


<style lang="scss" scoped>

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
    left: -32px;
    display: inline-block;
  }

  .content-card {
    width: 100%;
  }

</style>
