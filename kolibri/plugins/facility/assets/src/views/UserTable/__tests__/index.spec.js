import { shallowMount, mount } from '@vue/test-utils';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import UserTable from '../index';

function makeWrapper({ propsData } = {}) {
  return mount(UserTable, {
    propsData,
  });
}

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
    const wrapper = shallowMount(UserTable);
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`doesn't show the select all checkbox by default`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="selectAllCheckbox"]').exists()).toBeFalsy();
  });

  it(`shows full name header`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="fullNameHeader"]').text()).toBe('Full name');
    expect(wrapper.find('[data-test="fullNameHeader"]').classes()).not.toContain('visuallyhidden');
  });

  it(`shows username header`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="usernameHeader"]').text()).toBe('Username');
    expect(wrapper.find('[data-test="usernameHeader"]').classes()).not.toContain('visuallyhidden');
  });

  it(`renders role header but it is visually hidden`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="roleHeader"]').text()).toBe('Role');
    expect(wrapper.find('[data-test="roleHeader"]').classes()).toContain('visuallyhidden');
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
      const fullNames = wrapper.findAll('[data-test="fullName"]');
      expect(fullNames.length).toBe(2);
      expect(fullNames.at(0).text()).toBe('Learner Full Name');
      expect(fullNames.at(1).text()).toBe('Coach Full Name');
    });

    it(`shows usernames`, () => {
      const usernames = wrapper.findAll('[data-test="username"]');
      expect(usernames.length).toBe(2);
      expect(usernames.at(0).text()).toBe('username-learner');
      expect(usernames.at(1).text()).toBe('username-coach');
    });

    it(`doesn't show checkboxes to select users by default`, () => {
      expect(wrapper.find('[data-test="userCheckbox"]').exists()).toBeFalsy();
    });

    it(`shows the user role badge for users who are not learners`, () => {
      const userRoleBadges = wrapper.findAll('[data-test="userRoleBadge"]');
      expect(userRoleBadges.length).toBe(1);
      expect(userRoleBadges.at(0).text()).toBe('Facility coach');
    });

    it(`renders user role labels but they are visually hidden`, () => {
      const userRoleLabels = wrapper.findAll('[data-test="userRoleLabel"]');
      expect(userRoleLabels.length).toBe(2);
      // TODO: Shouldn't we use the translation rather than
      // the constant value similarly to what we show in role badges?
      expect(userRoleLabels.at(0).text()).toBe('learner');
      expect(userRoleLabels.at(0).classes()).toContain('visuallyhidden');
      expect(userRoleLabels.at(1).text()).toBe('coach');
      expect(userRoleLabels.at(1).classes()).toContain('visuallyhidden');
    });
  });

  describe('when selectable', () => {
    it(`shows the select all checkbox`, () => {
      const wrapper = makeWrapper({ propsData: { selectable: true, value: [] } });
      expect(wrapper.find('[data-test="selectAllCheckbox"]').exists()).toBeTruthy();
    });

    it(`the select all checkbox is disabled when there are no users`, () => {
      const wrapper = makeWrapper({ propsData: { selectable: true, value: [] } });
      expect(
        wrapper.find('[data-test="selectAllCheckbox"]').find('input').element.disabled
      ).toBeTruthy();
    });

    it(`the select all checkbox is enabled by default when there are some users`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      expect(
        wrapper.find('[data-test="selectAllCheckbox"]').find('input').element.disabled
      ).toBeFalsy();
    });

    it(`the select all checkbox is disabled when 'disabled' is truthy`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [], disabled: true },
      });
      expect(
        wrapper.find('[data-test="selectAllCheckbox"]').find('input').element.disabled
      ).toBeTruthy();
    });

    describe(`checking the select all checkbox`, () => {
      it(`emits the 'input' event with all users in its payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-learner', 'id-coach']);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual([
          'id-to-be-preserved',
          'id-learner',
          'id-coach',
        ]);
      });
    });

    describe(`unchecking the select all checkbox`, () => {
      it(`emits the 'input' event with no users in its payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual([]);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        wrapper.find('[data-test="selectAllCheckbox"]').trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual(['id-to-be-preserved']);
      });
    });

    it(`shows checkboxes to select users`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      const userCheckboxes = wrapper.findAll('[data-test="userCheckbox"]');
      expect(userCheckboxes.length).toBe(2);
    });

    it(`checkboxes to select users are enabled by default`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [] },
      });
      const userCheckboxes = wrapper.findAll('[data-test="userCheckbox"]');
      expect(userCheckboxes.at(0).find('input').element.disabled).toBeFalsy();
      expect(userCheckboxes.at(1).find('input').element.disabled).toBeFalsy();
    });

    it(`checkboxes to select users are disabled when 'disabled' is truthy`, () => {
      const wrapper = makeWrapper({
        propsData: { users: TEST_USERS, selectable: true, value: [], disabled: true },
      });
      const userCheckboxes = wrapper.findAll('[data-test="userCheckbox"]');
      expect(userCheckboxes.at(0).find('input').element.disabled).toBeTruthy();
      expect(userCheckboxes.at(1).find('input').element.disabled).toBeTruthy();
    });

    describe(`checking a user checkbox`, () => {
      it(`emits the 'input' event with the user in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-coach']);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        expect(wrapper.emitted().input.length).toBe(1);
        expect(wrapper.emitted().input[0][0]).toEqual(['id-to-be-preserved', 'id-coach']);
      });
    });

    describe(`unchecking a user checkbox`, () => {
      it(`emits the 'input' event with the user removed from the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: [] },
        });
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual([]);
      });

      // see commit 6a060ba
      it(`preserves users that were previously in 'value' in the payload`, () => {
        const wrapper = makeWrapper({
          propsData: { users: TEST_USERS, selectable: true, value: ['id-to-be-preserved'] },
        });
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        wrapper
          .findAll('[data-test="userCheckbox"]')
          .at(1)
          .trigger('click');
        expect(wrapper.emitted().input.length).toBe(2);
        expect(wrapper.emitted().input[1][0]).toEqual(['id-to-be-preserved']);
      });
    });
  });
});
