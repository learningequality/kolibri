<template>

  <li class="bookmark-item">
    <div class="bookmark-item-title-container">
      <span
        v-if="item.items && item.items.length > 0"
        class="dropdown-icon-container"
        tabindex="0"
        role="button"
        :aria-label="$tr('expand')"
        aria-controls="pdf-container"
        @click="toggleExpanded"
        @keydown.enter="toggleExpanded"
        @keydown.space="toggleExpanded"
      >
        <KIcon
          icon="chevronRight"
          class="dropdown-icon"
          :class="{ expanded: expanded }"
        />
      </span>
      <span
        tabindex="0"
        class="bookmark-item-title"
        role="button"
        @click="goToDestination(item.dest)"
        @keydown.shift.enter="focusDestPage(item.dest, $event)"
        @keydown.enter.exact="goToDestination(item.dest)"
        @keydown.space="goToDestination(item.dest)"
      >
        {{ item.title }}
      </span>
    </div>
    <ul
      v-if="expanded"
      class="bookmark-children"
    >
      <BookmarkItem
        v-for="(child, index) in item.items"
        :key="index"
        :item="child"
        :goToDestination="goToDestination"
        :focusDestPage="focusDestPage"
      />
    </ul>
  </li>

</template>


<script>

  export default {
    name: 'BookmarkItem',
    props: {
      item: {
        type: Object,
        required: true,
      },
      goToDestination: {
        type: Function,
        required: true,
      },
      focusDestPage: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        expanded: false,
      };
    },
    methods: {
      toggleExpanded() {
        this.expanded = !this.expanded;
      },
    },
    $trs: {
      expand: 'Expand bookmark',
    },
  };

</script>


<style lang="scss" scoped>

  .bookmark-item {
    position: relative;
    font-size: 12px;
    list-style: none;

    .bookmark-item-title-container {
      display: flex;
      margin-bottom: 16px;
      font-size: 14px;
      cursor: pointer;
    }

    .bookmark-item-title:focus-visible,
    .dropdown-icon-container:focus-visible {
      outline-width: 3px;
      outline-style: solid;
      outline-color: #8dc5b6;
      outline-offset: 4px;
    }

    .dropdown-icon-container {
      position: relative;
      top: 2px;
      padding-right: 16px;
      font-size: 16px;

      .dropdown-icon {
        transition: transform 0.2s ease-in-out;
        transform: rotate(0deg);

        &.expanded {
          transform: rotate(90deg);
        }
      }
    }

    .bookmark-children {
      padding-left: 48px;
    }
  }

</style>
