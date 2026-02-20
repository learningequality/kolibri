<template>

  <div class="content-list">
    <KCheckbox
      v-if="showSelectAll"
      :label="$tr('selectAllCheckboxLabel')"
      :checked="selectAllChecked"
      :indeterminate="selectAllIndeterminate"
      :disabled="isSelectAllDisabled"
      @change="$emit('changeselectall', $event)"
    />
    <KCardGrid layout="1-1-1">
      <component
        :is="content.is_leaf ? 'AccessibleResourceCard' : 'AccessibleFolderCard'"
        v-for="content in contentList"
        :key="content.id"
        :to="contentCardLink(content)"
        :contentNode="content"
        :thumbnailSrc="content.thumbnail"
        :headingLevel="cardsHeadingLevel"
        :isBookmarked="isBookmarked(content.id)"
        @toggleBookmark="toggleBookmark"
      >
        <template #belowTitle>
          <KTextTruncator
            v-if="contentCardMessage(content)"
            :text="contentCardMessage(content)"
            :maxLines="1"
            style="margin-bottom: 8px"
          />
        </template>
        <template #select>
          <KCheckbox
            v-if="contentHasCheckbox(content) && !showRadioButtons"
            :label="content.title"
            :showLabel="false"
            :checked="contentIsChecked(content)"
            :indeterminate="contentIsIndeterminate(content)"
            :disabled="contentCheckboxDisabled(content)"
            @change="handleCheckboxChange(content, $event)"
          />
          <KRadioButton
            v-else-if="contentHasCheckbox(content) && showRadioButtons"
            class="radio-selector"
            :label="content.title"
            :showLabel="false"
            :currentValue="contentIsChecked(content) ? content.id : 'none'"
            :buttonValue="content.id"
            :disabled="contentCheckboxDisabled(content)"
            @change="handleCheckboxChange(content, true)"
          />
        </template>
      </component>
    </KCardGrid>

    <template>
      <KButton
        v-if="showButton"
        :text="coreString('viewMoreAction')"
        :primary="false"
        style="margin-top: 2em"
        @click="$emit('moreresults')"
      />
      <KCircularLoader
        v-if="viewMoreButtonState === ViewMoreButtonStates.LOADING"
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

  import { computed, ref } from 'vue';
  import urls from 'kolibri/urls';
  import client from 'kolibri/client';
  import useUser from 'kolibri/composables/useUser';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import BookmarksResource from 'kolibri-common/apiResources/BookmarksResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AccessibleFolderCard from 'kolibri-common/components/Cards/AccessibleFolderCard';
  import AccessibleResourceCard from 'kolibri-common/components/Cards/AccessibleResourceCard';
  import { ViewMoreButtonStates } from '../../../constants/index';

  export default {
    name: 'ContentCardList',
    components: {
      AccessibleResourceCard,
      AccessibleFolderCard,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { coreString } = commonCoreStrings.methods;
      const { sendPoliteMessage } = useKLiveRegion();
      // Map of contentnode_id to bookmark resource ID
      const bookmarks = ref({});
      // Map of contentNode IDs to bookmark resource IDs
      const bookmarkedContentNodeIds = computed(() => Object.keys(bookmarks.value));
      const { currentUserId } = useUser();

      /**
       * Fetch bookmarks and store them in the bookmarks ref mapping
       * their contentnode_id to the bokomark's own ID.
       * The contentnode_id is used for creating it, but we need the
       * bookmark's ID to delete it.
       */
      function getBookmarks() {
        BookmarksResource.fetchCollection({ force: true }).then(data => {
          bookmarks.value = data.reduce((memo, bookmark) => {
            memo[bookmark.contentnode_id] = bookmark.id;
            return memo;
          }, {});
        });
      }

      function deleteBookmark(contentnode_id) {
        client({
          method: 'delete',
          url: urls['kolibri:core:bookmarks_detail'](contentnode_id),
        }).then(() => {
          getBookmarks();
          sendPoliteMessage(coreString('removedFromBookmarks'));
        });
      }

      function addBookmark(contentnode_id) {
        client({
          method: 'post',
          url: urls['kolibri:core:bookmarks_list'](),
          data: {
            contentnode_id: contentnode_id,
            user: currentUserId.value,
          },
        }).then(() => {
          getBookmarks();
          sendPoliteMessage(coreString('savedToBookmarks'));
        });
      }

      function isBookmarked(contentnode_id) {
        return bookmarkedContentNodeIds.value.includes(contentnode_id);
      }

      function toggleBookmark(contentnode_id) {
        if (isBookmarked(contentnode_id)) {
          const bookmarkId = bookmarks.value[contentnode_id];
          deleteBookmark(bookmarkId);
        } else {
          addBookmark(contentnode_id);
        }
      }

      getBookmarks();
      return {
        ViewMoreButtonStates,
        toggleBookmark,
        isBookmarked,
      };
    },
    props: {
      showSelectAll: {
        type: Boolean,
        default: false,
      },
      isSelectAllDisabled: {
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
        required: false,
        default: () => '',
      },
      // Function that returns a route object to which the card navigates
      contentCardLink: {
        type: Function, // ContentNode => Route
        required: true,
      },
      // Heading level for the cards
      cardsHeadingLevel: {
        type: Number,
        default: 3,
      },
    },

    computed: {
      showButton() {
        return this.viewMoreButtonState === this.ViewMoreButtonStates.HAS_MORE;
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
    margin: 0;
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

  .filter-chip {
    display: inline-block;
    font-size: 14px;
    vertical-align: top;
    border-radius: 0.25em;
  }

  .filter-chip-text {
    display: inline-block;
    margin: 4px 8px;
    font-size: 11px;
  }

  .radio-selector {
    /* The default width 100% doesn't work here */
    width: auto;
  }

</style>
