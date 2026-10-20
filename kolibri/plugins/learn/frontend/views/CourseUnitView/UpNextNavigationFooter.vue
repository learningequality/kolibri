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
        :ariaLabel="ariaLabel"
        @click="$emit('next')"
      />
      <KIconButton
        v-else
        icon="permissions"
        :ariaLabel="ariaLabel"
        disabled
      />
    </div>
  </div>

</template>


<script>

  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';

  const { footerNavigationAccessibleLabel$, footerNavigationUnavailableAccessibleLabel$ } =
    coursesStrings;

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
    computed: {
      ariaLabel() {
        if (this.nextEnabled) {
          return footerNavigationAccessibleLabel$({
            label: this.label,
            title: this.nextNode.title,
          });
        }
        return footerNavigationUnavailableAccessibleLabel$({ title: this.nextNode.title });
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
