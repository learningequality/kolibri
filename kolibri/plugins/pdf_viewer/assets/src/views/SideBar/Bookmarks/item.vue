<template>
  <li class="bookmark-item">
    <div class="bookmark-item-title-container">
      <span
        v-if="item.items && item.items.length > 0"
        tabindex="0"
        class="dropdown-icon-container"
        @click="toggleExpanded"
        @keydown.enter="toggleExpanded"
        @keydown.space="toggleExpanded"
      >
        <KIcon
          aria-controls="pdf-container"
          icon="chevronRight"
          class="dropdown-icon"
          :class="{ 'expanded': expanded }"
        />
      </span>
      <span
        tabindex="0"
        class="bookmark-item-title"
        role="button"
        @click="goToDestination(item.dest)"
        @keydown.enter="goToDestination(item.dest)"
        @keydown.space="goToDestination(item.dest)"
      >
        {{ item.title }}
      </span>
    </div>
    <ul v-if="expanded" class="bookmark-children">
      <BookmarkItem
        v-for="(child, index) in item.items"
        :item="child"
        :key="index"
        :goToDestination="goToDestination"
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
  }
</script>
<style scoped lang="scss">
  .bookmark-item {
    font-size: 12px;
    list-style: none;
    position: relative;
    .bookmark-item-title-container {
      display: flex;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .bookmark-item-title:focus-visible,
    .dropdown-icon-container:focus-visible {
      outline-width: medium;
      outline-style: solid;
    }
    .dropdown-icon-container {
      padding-right: 16px;
      position: relative;
      top: 2px;
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