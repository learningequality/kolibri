<template>

  <ul class="content-list">
    <KCheckbox
      :label="$tr('selectAllCheckboxLabel')"
      v-if="showSelectAll"
      :checked="selectAllChecked"
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

</template>


<script>

  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import LessonContentCard from './LessonContentCard';

  export default {
    name: 'ContentCardList',
    components: {
      KCheckbox,
      LessonContentCard,
    },
    props: {
      showSelectAll: {
        type: Boolean,
        default: false,
      },
      selectAllChecked: {
        type: Boolean,
        default: false,
      },
      contentList: {
        type: Array,
        required: true,
      },
      // Function that returns true if content item is in the assignment
      contentIsChecked: {
        type: Function, // ContentNode => Boolean
        required: true,
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
    methods: {
      handleCheckboxChange(contentId, checked) {
        this.$emit('change_content_card', { contentId, checked });
      },
    },
    $trs: {
      selectAllCheckboxLabel: 'Select all',
      // Used for future 'View more' button
      viewMoreButtonLabel: 'View more',
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
