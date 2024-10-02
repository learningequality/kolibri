<template>

  <!-- Negative margin removes empty space left by relatively
  positioning the select all checkbox to make sure the table has
  visually the same top margin no matter if `selectable` or no
  (important for consistency, e.g. when it is rendered below other
  components like user search box) -->
  <div :style="[showSelectAllCheckbox ? { marginTop: '-44px' } : {}]">
    <KCheckbox
      v-if="showSelectAllCheckbox"
      :label="$tr('selectAllLabel')"
      :showLabel="true"
      :checked="allAreSelected"
      :disabled="disabled || !users || users.length === 0"
      class="select-all"
      :style="{ color: $themeTokens.annotation }"
      data-test="selectAllCheckbox"
      @change="selectAll($event)"
    />
    <CoreTable
      :emptyMessage="emptyMessage"
      :dataLoading="dataLoading"
    >
      <template #headers>
        <th
          data-test="fullNameHeader"
          :style="{ minWidth: '32px' }"
        >
          <span
            v-if="selectable"
            class="visuallyhidden"
          >
            {{ $tr('selectUserBy') }}
          </span>
          <span :class="{ visuallyhidden: showSelectAllCheckbox }">
            {{ coreString('fullNameLabel') }}
          </span>
        </th>
        <th>
          <span
            class="visuallyhidden"
            data-test="roleHeader"
          >
            {{ $tr('role') }}
          </span>
        </th>
        <th data-test="usernameHeader">
          {{ coreString('usernameLabel') }}
        </th>
        <th v-if="$scopedSlots.info">
          {{ infoDescriptor }}
        </th>
        <template v-if="showDemographicInfo">
          <th>
            <span>{{ coreString('identifierLabel') }}</span>
            <CoreInfoIcon
              class="tooltip"
              :iconAriaLabel="coreString('identifierAriaLabel')"
              :tooltipText="coreString('identifierTooltip')"
            />
          </th>
          <th>
            {{ coreString('genderLabel') }}
          </th>
          <th>
            {{ coreString('birthYearLabel') }}
          </th>
        </template>
        <th
          v-if="$scopedSlots.action"
          class="user-action-button"
        >
          <span class="visuallyhidden">
            {{ coreString('userActionsColumnHeader') }}
          </span>
        </th>
      </template>

      <template #tbody>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            :style="isSelectedStyle(user.id)"
          >
            <td>
              <KCheckbox
                v-if="selectable && enableMultipleSelection"
                :disabled="disabled"
                :checked="userIsSelected(user.id)"
                class="user-checkbox"
                data-test="userCheckbox"
                @change="selectUser(user.id, $event)"
              >
                <KLabeledIcon
                  :icon="isCoach ? 'coach' : 'person'"
                  :label="user.full_name"
                  data-test="fullName"
                />
                <UserTypeDisplay
                  aria-hidden="true"
                  :userType="user.kind"
                  :omitLearner="true"
                  class="role-badge"
                  data-test="userRoleBadge"
                  :class="$computedClass(userRoleBadgeStyle)"
                />
              </KCheckbox>
              <!--
                @MisRob: It's possible to pass `<label>` content to `KRadioButton`
                via the default slot, however it's not what this slot has been
                made for so doing so is hackish, even though resulting
                markup seems fine. To be able to do this, I also needed to pass
                the empty label to required `label` prop to avoid Vue warnings.
                I still find this to be better solution in regards to a11y than
                not providing label content. Reported related KDS issue
                https://github.com/learningequality/kolibri-design-system/issues/348
              -->
              <KRadioButton
                v-else-if="selectable && !enableMultipleSelection"
                :disabled="disabled"
                :buttonValue="user.id"
                :currentValue="firstSelectedUser"
                :label="''"
                data-test="userRadioButton"
                @change="selectSingleUser(user.id)"
              >
                <!--
                  override muted color in the disabled state with
                  the normal text color in `style` (using `color`
                  prop won't work for this purpose)
                -->
                <KLabeledIcon
                  :icon="isCoach ? 'coach' : 'person'"
                  :label="user.full_name"
                  data-test="fullName"
                  :style="{ color: $themeTokens.text }"
                />
                <UserTypeDisplay
                  aria-hidden="true"
                  :userType="user.kind"
                  :omitLearner="true"
                  class="role-badge"
                  data-test="userRoleBadge"
                  :class="$computedClass(userRoleBadgeStyle)"
                />
              </KRadioButton>
              <template v-else>
                <KLabeledIcon
                  :icon="isCoach ? 'coach' : 'person'"
                  :label="user.full_name"
                  :style="{ color: $themeTokens.text }"
                  data-test="fullName"
                />
                <UserTypeDisplay
                  aria-hidden="true"
                  :userType="user.kind"
                  :omitLearner="true"
                  class="role-badge"
                  data-test="userRoleBadge"
                  :class="$computedClass(userRoleBadgeStyle)"
                />
              </template>
            </td>
            <td
              class="visuallyhidden"
              data-test="userRoleLabel"
            >
              {{ typeDisplayMap[user.kind] }}
            </td>
            <td
              data-test="username"
              :style="{ color: $themeTokens.text }"
            >
              <span dir="auto">
                {{ user.username }}
              </span>
            </td>
            <template v-if="showDemographicInfo">
              <td class="id-col">
                <KOptionalText :text="user.id_number ? user.id_number : ''" />
              </td>
              <td>
                <GenderDisplayText :gender="user.gender" />
              </td>
              <td>
                <BirthYearDisplayText :birthYear="user.birth_year" />
              </td>
            </template>
            <td v-if="$scopedSlots.info">
              <slot
                name="info"
                :user="user"
              ></slot>
            </td>
            <td
              v-if="$scopedSlots.action"
              class="core-table-button-col"
            >
              <slot
                name="action"
                :user="user"
              ></slot>
            </td>
          </tr>
        </tbody>
      </template>
    </CoreTable>
  </div>

</template>


<script>

  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import difference from 'lodash/difference';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import GenderDisplayText from 'kolibri.coreVue.components.GenderDisplayText';
  import BirthYearDisplayText from 'kolibri.coreVue.components.BirthYearDisplayText';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import translatedUserKinds from 'kolibri.coreVue.mixins.translatedUserKinds';

  export default {
    name: 'UserTable',
    components: {
      CoreInfoIcon,
      CoreTable,
      UserTypeDisplay,
      GenderDisplayText,
      BirthYearDisplayText,
    },
    mixins: [commonCoreStrings, translatedUserKinds],
    props: {
      users: {
        type: Array,
        required: true,
      },
      emptyMessage: {
        type: String,
        default: null,
      },
      selectable: {
        type: Boolean,
        default: false,
      },
      // This will only work when `selectable` prop is truthy.
      // If true, multiple users can be selected via checkboxes
      // and the select all checkbox is rendered.
      // Otherwise only a single user can be selected
      // and the select all checkbox is not rendered.
      enableMultipleSelection: {
        type: Boolean,
        default: true,
      },
      // required when 'selectable' is truthy
      // used for optional checkboxes
      value: {
        type: Array,
        default: null,
      },
      isCoach: {
        type: Boolean,
        default: false,
      },
      infoDescriptor: {
        type: String,
        default: '',
      },
      // If true, shows ID number, gender, and birth year columns
      showDemographicInfo: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      selectedStyle: {
        type: String,
        default: '',
      },
      dataLoading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      userRoleBadgeStyle() {
        return {
          color: this.$themeTokens.textInverted,
          backgroundColor: this.$themeTokens.annotation,
          '::selection': {
            color: this.$themeTokens.text,
          },
        };
      },
      showSelectAllCheckbox() {
        return this.selectable && this.enableMultipleSelection;
      },
      allAreSelected() {
        return (
          Boolean(this.users && this.users.length) &&
          this.users.every(user => this.value.includes(user.id))
        );
      },
      firstSelectedUser() {
        return this.value && this.value.length ? this.value[0] : '';
      },
    },
    methods: {
      userIsSelected(id) {
        if (this.value) return this.value.includes(id);
        return false;
      },
      isSelectedStyle(id) {
        if (this.userIsSelected(id)) return this.selectedStyle;
        return '';
      },
      selectAll() {
        const currentUsers = this.users.map(user => user.id);
        if (this.allAreSelected) {
          // All of them are already selected, so emit the value without currently shown users
          return this.$emit('input', difference(this.value, currentUsers));
        } else {
          // Some or none of them are selected, so emit value including all of those which were not
          // already selected
          return this.$emit(
            'input',
            this.value.concat(currentUsers.filter(item => this.value.indexOf(item) < 0)),
          );
        }
      },
      selectSingleUser(id) {
        this.$emit('input', [id]);
      },
      selectUser(id) {
        const selected = Array.from(this.value);
        if (this.userIsSelected(id)) {
          // id is already selected, so remove it from what we emit
          return this.$emit(
            'input',
            selected.filter(selectedId => selectedId !== id),
          );
        } else {
          // Otherwise, we are adding the id to what we emit
          selected.push(id);
          return this.$emit('input', selected);
        }
      },
    },
    $trs: {
      role: {
        message: 'Role',
        context: "Indicates the user's role (coach, learner etc.)",
      },
      selectAllLabel: {
        message: 'Select all',
        context: 'Generic checkbox label used to select all elements in a list.',
      },
      selectUserBy: {
        message: 'Select user by:',
        context:
          "Visually hidden part of the header of a column in a table of facility users to provide more context for people using screenreaders (it prepends 'Full name' string that can be rendered as a visible header). It is rendered when users can be selected from a table by checking associated checkboxes or a radio button displayed next to facility users' full names.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  // TODO: Determine if this should be the default in KDS
  // as this overrides the value in KLabledIcon's styles
  // of width: 100%
  .labeled-icon-wrapper {
    width: auto;
  }

  .select-all {
    // 1-3: move the select all checkbox on the place
    // of the visually hidden full name table header that
    // is hidden when the select all checkbox is visible
    position: relative; // 1
    top: 46px; // 2
    left: 8px; // 3
    font-size: 12px;
    font-weight: bold;
  }

  // consistent vertical alignment of checkboxes
  // and text in a row
  .user-checkbox {
    margin-top: 0;
    margin-bottom: 0;
  }

  .empty-message {
    margin-bottom: 16px;
  }

  .role-badge {
    display: inline-block;
    padding: 0;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .tooltip {
    margin-left: 2px;
  }

  td.id-col {
    max-width: 120px;
  }

</style>
