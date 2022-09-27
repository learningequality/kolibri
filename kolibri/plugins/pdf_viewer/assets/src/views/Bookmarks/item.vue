<template>
  <li class="bookmark-item">
    <div class="bookmark-item-title-container">
      <span
        v-if="item.items && item.items.length > 0"
        tabindex="0"
        class="dropdown-icon-container"
        role="button"
        @click="toggleExpanded"
        @keydown.enter="toggleExpanded"
      >
        <KIcon
          aria-controls="pdf-container"
          icon="dropdown"
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
      cursor: pointer;
    }
    .bookmark-item-title:focus-visible,
    .dropdown-icon-container:focus-visible {
      outline-width: medium;
      outline-style: solid;
    }
    .dropdown-icon {
      transform: rotate(-90deg);
      transition: transform 0.1s ease-in-out;
      &.expanded {
        transform: rotate(0deg);
      }
      .bookmark-children {
        padding-left: 32px;
      }
    }
  }
</style>