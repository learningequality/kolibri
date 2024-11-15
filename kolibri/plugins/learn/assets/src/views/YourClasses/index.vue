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
      <KFixedGridItem
        :span="1"
        alignment="right"
      >
        <KRouterLink
          v-if="displayAllClassesLink"
          :text="coreString('viewAll')"
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

    <KCircularLoader v-else-if="loading" />

    <p v-else-if="!loading">
      {{ $tr('noClasses') }}
    </p>
  </section>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
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
    mixins: [commonCoreStrings],
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
      loading: {
        type: Boolean,
        default: null,
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
      yourClassesHeader: {
        message: 'Your classes',
        context: 'Refers to the classes the learner is enrolled in.',
      },
      noClasses: {
        message: 'You are not enrolled in any classes',
        context:
          'Message that a learner sees in the Learn > CLASSES section and in the Learn > HOME section if they are not enrolled in any classes.',
      },
    },
  };

</script>
