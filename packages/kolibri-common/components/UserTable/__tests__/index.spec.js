import { mount } from '@vue/test-utils';
import { UserKinds } from 'kolibri/constants';
import { coreStoreFactory } from 'kolibri/store';
import UserTable from '../index';

function makeWrapper({ propsData } = {}) {
  const store = coreStoreFactory();
  return mount(UserTable, {
    store,
    propsData,
  });
}
const getSelectAllCheckbox = wrapper => wrapper.find('[data-testid="selectAllCheckbox"]');
const getFullNameHeader = wrapper => wrapper.find('[data-testid="fullNameHeader"]');
const getUsernameHeader = wrapper => wrapper.find('[data-testid="usernameHeader"]');
const getRoleHeader = wrapper => wrapper.find('[data-testid="roleHeader"]');
const getFullNames = wrapper => wrapper.findAll('[data-testid="fullName"]');
const getUserRoleBadges = wrapper => wrapper.findAll('[data-testid="userRoleBadge"]');
const getUserRoleLabels = wrapper => wrapper.findAll('[data-testid="userRoleLabel"]');
const getUsernames = wrapper => wrapper.findAll('[data-testid="username"]');
const getUserCheckboxes = wrapper => wrapper.findAll('[data-testid="userCheckbox"]');
const getUserRadioButtons = wrapper => wrapper.findAll('[data-testid="userRadioButton"]');

const TEST_USERS = [
  {
    id: 'id-learner',
    full_name: 'Learner Full Name',
    kind: UserKinds.LEARNER,
    username: 'username-learner',
  },
  {
    id: 'id-coach',
    full_name: 'Coach Full Name',
    kind: UserKinds.COACH,
    username: 'username-coach',
  },
];

describe(`UserTable`, () => {
  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`doesn't show the select all checkbox by default`, () => {
    const wrapper = makeWrapper();
    expect(getSelectAllCheckbox(wrapper).exists()).toBeFalsy();
  });

  it(`shows full name header`, () => {
    const wrapper = makeWrapper();
    expect(getFullNameHeader(wrapper).text()).toBe('Full name');
    expect(getFullNameHeader(wrapper).classes()).not.toContain('visuallyhidden');
  });

  it(`shows username header`, () => {
    const wrapper = makeWrapper();
    expect(getUsernameHeader(wrapper).text()).toBe('Username');
    expect(getUsernameHeader(wrapper).classes()).not.toContain('visuallyhidden');
  });

  it(`renders role header but it is visually hidden`, () => {
    const wrapper = makeWrapper();
    expect(getRoleHeader(wrapper).text()).toBe('Role');
    expect(getRoleHeader(wrapper).classes()).toContain('visuallyhidden');
  });

  describe(`when there are no users`, () => {
    it(`shows an empty message when it's provided`, () => {
      const wrapper = makeWrapper({ propsData: { emptyMessage: 'There are no users' } });
      expect(wrapper.text()).toContain('There are no users');
    });
  });

  describe(`when there are some users`, () => {
    let wrapper;
    beforeAll(() => {
      wrapper = makeWrapper({ propsData: { users: TEST_USERS } });
    });

    it(`shows full names`, () => {
      const fullNames = getFullNames(wrapper);
      expect(fullNames.length).toBe(2);
      expect(fullNames.at(0).text()).toBe('Learner Full Name');
      expect(fullNames.at(1).text()).toBe('Coach Full Name');
    });

    it(`shows usernames`, () => {
      const usernames = getUsernames(wrapper);
      expect(usernames.length).toBe(2);
      expect(usernames.at(0).text()).toBe('username-learner');
      expect(usernames.at(1).text()).toBe('username-coach');
    });

    it(`doesn't show checkboxes or radio buttons to select users by default`, () => {
      expect(getUserCheckboxes(wrapper).length).toBeFalsy();
      expect(getUserRadioButtons(wrapper).length).toBeFalsy();
    });

    it(`shows the user role badge for users who are not learners`, () => {
      const userRoleBadges = getUserRoleBadges(wrapper);
      expect(userRoleBadges.length).toBe(1);
      expect(userRoleBadges.at(0).text()).toBe('Facility coach');
    });

    it(`renders user role labels but they are visually hidden`, () => {
      const userRoleLabels = getUserRoleLabels(wrapper);
      expect(userRoleLabels.length).toBe(2);
      expect(userRoleLabels.at(0).text()).toBe('Learner');
      expect(userRoleLabels.at(0).classes()).toContain('visuallyhidden');
      expect(userRoleLabels.at(1).text()).toBe('Facility coach');
      expect(userRoleLabels.at(1).classes()).toContain('visuallyhidden');
    });
  });

  describe('when users are selectable and multiple selection is allowed', () => {
    it(`shows the select all checkbox`, () => {
      const wrapper = makeWrapper({ propsData: { selectable: true, value: [] } });
      expect(getSelectAllCheckbox(wrapper).exists()).toBeTruthy();
    });

    it(`the select all checkbox is disabled when there are no users`, () => {
      const wrapper = makeWrapper({ propsData: { selectable: true, value: [] } });
      expect(getSelectAllCheckbox(wrapper).find('input').element.disabled).toBeTruthy();
    });

    it(`the select all checkbox is enabled by default when there are some users`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      expect(getSelectAllCheckbox(wrapper).find('input').element.disabled).toBeFalsy();
    });

    it(`the select all checkbox is disabled when 'disabled' is truthy`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [], disabled: true },
      });
      expect(getSelectAllCheckbox(wrapper).find('input').element.disabled).toBeTruthy();
    });

    describe(`checking the select all checkbox`, () => {
      it(`emits the 'input' event with all users in its payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        getSelectAllCheckbox(wrapper).trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-learner', 'id-coach']);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        getSelectAllCheckbox(wrapper).trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual([
          'id-to-be-preserved',
          'id-learner',
          'id-coach',
        ]);
      });
    });

    describe(`unchecking the select all checkbox`, () => {
      it(`emits the 'input' event with no users in its payload`, async () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        await getSelectAllCheckbox(wrapper).trigger('click');
        await wrapper.setProps({ value: ['id-learner', 'id-coach'] });
        await getSelectAllCheckbox(wrapper).trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual([]);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, async () => {
        const wrapper = makeWrapper({
          propsData: {
            selectable: true,
            value: ['id-to-be-preserved'],
            users: TEST_USERS,
          },
        });
        await getSelectAllCheckbox(wrapper).trigger('click');
        await wrapper.setProps({ value: ['id-to-be-preserved', 'id-learner', 'id-coach'] });
        await getSelectAllCheckbox(wrapper).trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual(['id-to-be-preserved']);
      });
    });

    it(`shows checkboxes to select users`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      const userCheckboxes = getUserCheckboxes(wrapper);
      expect(userCheckboxes.length).toBe(2);
    });

    it(`checkboxes to select users are enabled by default`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      const userCheckboxes = getUserCheckboxes(wrapper);
      expect(userCheckboxes.at(0).find('input').element.disabled).toBeFalsy();
      expect(userCheckboxes.at(1).find('input').element.disabled).toBeFalsy();
    });

    it(`checkboxes to select users are disabled when 'disabled' is truthy`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [], disabled: true },
      });
      const userCheckboxes = getUserCheckboxes(wrapper);
      expect(userCheckboxes.at(0).find('input').element.disabled).toBeTruthy();
      expect(userCheckboxes.at(1).find('input').element.disabled).toBeTruthy();
    });

    describe(`checking a user checkbox`, () => {
      it(`emits the 'input' event with the user in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        getUserCheckboxes(wrapper).at(1).trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-coach']);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        getUserCheckboxes(wrapper).at(1).trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-to-be-preserved', 'id-coach']);
      });
    });
    describe(`unchecking a user checkbox`, () => {
      it(`emits the 'input' event with the user removed from the payload`, async () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        // First click selects the user
        await getUserCheckboxes(wrapper).at(1).trigger('click');
        await wrapper.setProps({ value: ['id-coach'] }); // Simulate parent update
        // Second click unselects the user
        await getUserCheckboxes(wrapper).at(1).trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual([]);
      });

      it(`preserves users that were previously in 'value' in the payload`, async () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        // First click adds "id-coach"
        await getUserCheckboxes(wrapper).at(1).trigger('click');
        await wrapper.setProps({ value: ['id-to-be-preserved', 'id-coach'] }); // Parent update
        // Second click removes "id-coach"
        await getUserCheckboxes(wrapper).at(1).trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual(['id-to-be-preserved']);
      });
    });
  });

  describe(`when users are selectable and multiple selection is not allowed`, () => {
    it(`doesn't show the select all checkbox`, () => {
      const wrapper = makeWrapper({
        propsData: { selectable: true, enableMultipleSelection: false, value: [] },
      });
      expect(getSelectAllCheckbox(wrapper).exists()).toBeFalsy();
    });

    it(`shows radio buttons to select users`, () => {
      const wrapper = makeWrapper({
        propsData: {
          users: TEST_USERS,
          selectable: true,
          enableMultipleSelection: false,
          value: [],
        },
      });
      const radioButtons = getUserRadioButtons(wrapper);
      expect(radioButtons.length).toBe(2);
    });

    it(`radio buttons to select users are enabled by default`, () => {
      const wrapper = makeWrapper({
        propsData: {
          users: TEST_USERS,
          selectable: true,
          enableMultipleSelection: false,
          value: [],
        },
      });
      const radioButtons = getUserRadioButtons(wrapper);
      expect(radioButtons.at(0).find('input').element.disabled).toBeFalsy();
      expect(radioButtons.at(1).find('input').element.disabled).toBeFalsy();
    });

    it(`radio buttons to select users are disabled when 'disabled' is truthy`, () => {
      const wrapper = makeWrapper({
        propsData: {
          users: TEST_USERS,
          selectable: true,
          enableMultipleSelection: false,
          value: [],
          disabled: true,
        },
      });
      const radioButtons = getUserRadioButtons(wrapper);
      expect(radioButtons.at(0).find('input').element.disabled).toBeTruthy();
      expect(radioButtons.at(1).find('input').element.disabled).toBeTruthy();
    });

    describe(`checking a radio button`, () => {
      it(`emits the 'input' event with the user in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: {
            users: TEST_USERS,
            selectable: true,
            enableMultipleSelection: false,
            value: [],
          },
        });
        getUserRadioButtons(wrapper).at(1).find('input').trigger('change');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-coach']);
      });
    });
  });
});
