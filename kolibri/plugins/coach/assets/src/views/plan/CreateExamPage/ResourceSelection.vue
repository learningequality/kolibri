<template>

  <div class="select-resource">
    <h5
      class="title-style"
    >
      {{ sectionSettings$() }}
    </h5>
    <KGrid
      class="space-bottom-items"
    >
      <KGridItem
        :layout12="{ span: 4 }"
        :layout8="{ span: 3 }"
        :layout4="{ span: 1 }"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
          >
            <p>Math</p>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
          >
            <p>Early math</p>
          </KGridItem>
        </KGrid>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 7 }"
        :layout8="{ span: 5 }"
        :layout4="{ span: 3 }"
      >
        <p>Addition and subtraction within 20A</p>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';

  export default {
    name: 'ResourceSelection',
    setup() {
      const { sectionSettings$ } = enhancedQuizManagementStrings;

      return {
        sectionSettings$,
      };
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
    },
  };

</script>


<style scoped>
.select-resource{
  margin-top: -3em;
}
.title-style{
  font-weight:600;
  font-size: 1em;
}
</style>
