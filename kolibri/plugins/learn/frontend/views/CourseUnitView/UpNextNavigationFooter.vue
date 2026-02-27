<template>

  <div class="course-side-panel-footer">
    <div class="up-next-wrapper">
      <span class="up-next-label">
        {{ label }}
      </span>
      <span class="up-next-title">
        <KTextTruncator
          :text="nextNode.title"
          :maxLines="1"
        />
      </span>
    </div>
    <div>
      <KIconButton
        v-if="nextEnabled"
        icon="forward"
        @click="$emit('next')"
      />
      <KIconButton
        v-else
        icon="permissions"
        disabled
      />
    </div>
  </div>

</template>


<script>

  export default {
    name: 'UpNextNavigationFooter',
    props: {
      label: {
        type: String,
        default: '',
      },
      nextNode: {
        type: Object,
        required: true,
      },
      nextEnabled: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .course-side-panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 8px 8px 16px;

    .up-next-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .up-next-label {
        font-size: 12px;
      }

      .up-next-title {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
      }
    }
  }

</style>
