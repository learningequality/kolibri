<template>

  <component
    :is="layoutComponent"
    :title="title"
    :hasSelectedUsers="hasSelectedUsers"
    :showUsersTable="showUsersTable"
  >
    <template #headerActions>
      <slot name="headerActions"></slot>
    </template>
    <template #searchbox>
      <slot name="searchbox"></slot>
    </template>
    <template #filterLink>
      <slot name="filterLink"></slot>
    </template>
    <template #clearFiltersButton>
      <slot name="clearFiltersButton"></slot>
    </template>
    <template #selectionInfo>
      <slot name="selectionInfo"></slot>
    </template>
    <template #userActions>
      <slot name="userActions"></slot>
    </template>
    <template #paginationControls>
      <slot name="paginationControls"></slot>
    </template>
  </component>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { computed } from 'vue';
  import NormalLayout from './NormalLayout.vue';
  import SmallWindowLayout from './SmallWindowLayout.vue';

  export default {
    name: 'UsersTableToolbar',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const layoutComponent = computed(() =>
        windowIsSmall.value ? SmallWindowLayout : NormalLayout,
      );
      return { layoutComponent };
    },
    props: {
      title: {
        type: String,
        default: '',
      },
      hasSelectedUsers: {
        type: Boolean,
        required: true,
      },
      showUsersTable: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
  };

</script>
