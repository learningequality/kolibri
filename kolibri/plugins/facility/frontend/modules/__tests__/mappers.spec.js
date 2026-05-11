import { _userState } from '../mappers';

describe('_userState', () => {
  const baseFacilityUser = {
    id: 'user-1',
    facility: 'facility-1',
    username: 'testuser',
    full_name: 'Test User',
    is_superuser: false,
    roles: [],
    gender: 'MALE',
    birth_year: '1990',
    id_number: null,
    date_joined: '2023-01-01',
    date_deleted: null,
    picture_password: '3.7.12',
  };

  it('includes picture_password in the mapped state', () => {
    const state = _userState(baseFacilityUser);
    expect(state.picture_password).toBe('3.7.12');
  });

  it('preserves picture_password when it is null', () => {
    const state = _userState({ ...baseFacilityUser, picture_password: null });
    expect(state.picture_password).toBeNull();
  });

  it('maps core user fields correctly', () => {
    const state = _userState(baseFacilityUser);
    expect(state.id).toBe('user-1');
    expect(state.facility_id).toBe('facility-1');
    expect(state.username).toBe('testuser');
    expect(state.full_name).toBe('Test User');
  });
});
