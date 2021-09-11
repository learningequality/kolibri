<template>

  <section>
    <KFixedGrid :numCols="3">
      <KFixedGridItem :span="2">
        <h2 :style="{ marginTop: 0 }">
          <KLabeledIcon
            icon="classes"
            :label="$tr('yourClassesHeader')"
          />
        </h2>
      </KFixedGridItem>
      <KFixedGridItem :span="1" alignment="right">
        <KRouterLink
          v-if="displayAllClassesLink"
          :text="$tr('viewAll')"
          :to="allClassesLink"
          data-test="viewAllLink"
        />
      </KFixedGridItem>
    </KFixedGrid>

    <CardGrid
      v-if="classes && classes.length > 0"
      :gridType="2"
    >
      <CardLink
        v-for="c in visibleClasses"
        :key="c.id"
        data-test="classLink"
        :to="classAssignmentsLink(c.id)"
      >
        <h3
          dir="auto"
          :style="{ margin: 0, fontWeight: 'normal' }"
        >
          {{ c.name }}
        </h3>
      </CardLink>
    </CardGrid>

    <p v-else>
      {{ $tr('noClasses') }}
    </p>

  </section>

</template>


<script>

  import { ClassesPageNames } from '../../constants';
  import { classAssignmentsLink } from '../classes/classPageLinks';
  import CardGrid from '../cards/CardGrid';
  import CardLink from '../cards/CardLink';

  /**
   * Shows learner's classes.
   */
  export default {
    name: 'YourClasses',
    components: {
      CardGrid,
      CardLink,
    },
    props: {
      classes: {
        type: Array,
        required: true,
      },
      /**
       * If there is more than four classes, only first four of them
       * and "View all" link will be displayed if `true`
       */
      short: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        classAssignmentsLink,
      };
    },
    computed: {
      visibleClasses() {
        if (!this.classes) {
          return [];
        }
        if (this.short) {
          return this.classes.slice(0, 4);
        }
        return this.classes;
      },
      allClassesLink() {
        return { name: ClassesPageNames.ALL_CLASSES };
      },
      displayAllClassesLink() {
        return this.classes && this.classes.length > this.visibleClasses.length;
      },
    },
    $trs: {
      yourClassesHeader: 'Your classes',
      noClasses: 'You are not enrolled in any classes',
      viewAll: 'View all',
    },
  };

</script>
