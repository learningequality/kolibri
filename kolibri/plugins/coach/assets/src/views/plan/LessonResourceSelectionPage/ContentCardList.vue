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
        :aria-selected="contentIsChecked(content)"
      >
        <KCheckbox
          v-if="contentHasCheckbox(content) && !showRadioButtons"
          class="content-checkbox"
          :label="content.title"
          :showLabel="false"
          :checked="contentIsChecked(content)"
          :indeterminate="contentIsIndeterminate(content)"
          :disabled="contentCheckboxDisabled(content)"
          @change="handleCheckboxChange(content, $event)"
        />
        <KRadioButton
          v-else-if="contentHasCheckbox(content) && showRadioButtons"
          class="content-checkbox"
          :label="content.title"
          :showLabel="false"
          :currentValue="contentIsChecked(content) ? content.id : 'none'"
          :buttonValue="content.id"
          :disabled="contentCheckboxDisabled(content)"
          @change="handleCheckboxChange(content, true)"
        />
        <!--
          disabled, tabindex, is-leaf class set here to hack making the card not clickable
          if you're trying to make the card clickable remove these properties
        -->
        <LessonContentCard
          class="content-card"
          :disabled="content.is_leaf"
          :tabindex="content.is_leaf ? -1 : 0"
          :class="{ 'with-checkbox': needCheckboxes }"
          :content="content"
          :message="contentCardMessage(content)"
          :link="contentCardLink(content)"
        >
          <template #notice>
            <slot
              name="notice"
              :content="content"
            ></slot>
          </template>
        </LessonContentCard>
      </li>
    </ul>

    <template>
      <KButton
        v-if="showButton && !loadingMoreState"
        :text="coreString('viewMoreAction')"
        :primary="false"
        @click="$emit('moreresults')"
      />
      <KCircularLoader
        v-if="(viewMoreButtonState === ViewMoreButtonStates.LOADING) & loadingMoreState"
        :delay="false"
      />
      <!-- TODO introduce messages in next version -->
      <p v-else-if="viewMoreButtonState === ViewMoreButtonStates.ERROR">
        <KIcon icon="error" />
        <!-- {{ $tr('moreResultsError') }} -->
      </p>
      <p v-else-if="contentList.length === 0">
        {{ coreString('noResultsLabel') }}
      </p>
    </template>
  </div>

</template>


<script>

  import { computed, toRefs } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ViewMoreButtonStates } from '../../../constants/index';
  import LessonContentCard from './LessonContentCard';

  export default {
    name: 'ContentCardList',
    components: {
      LessonContentCard,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { selectAllChecked, selectAllIndeterminate } = toRefs(props);
      // Code too long to display in template
      const ariaChecked = computed(() => {
        return selectAllChecked.value ? true : selectAllIndeterminate.value ? 'mixed' : false;
      });
      return {
        ariaChecked,
        ViewMoreButtonStates,
      };
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
      // Function that returns true if the content item is disabled
      contentCheckboxDisabled: {
        type: Function, // ContentNode => Boolean
        default: () => false,
      },
      // Boolean to toggle on use of radio buttons instead of checkboxes
      showRadioButtons: {
        type: Boolean,
        default: false,
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
      loadingMoreState: {
        type: Boolean,
        default: false,
      },
    },

    computed: {
      showButton() {
        return this.viewMoreButtonState === this.ViewMoreButtonStates.HAS_MORE;
      },
      needCheckboxes() {
        return this.contentList.some(c => this.contentHasCheckbox(c));
      },
    },
    methods: {
      handleCheckboxChange(content, checked) {
        this.$emit('change_content_card', { content, checked });
      },
    },
    $trs: {
      selectAllCheckboxLabel: {
        message: 'Select all',
        context: 'Generic checkbox label used to select all elements in a list.',
      },
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
