import { generateNavRoute } from '../generateNavRoutes';

describe('generateNavRoutes utility', () => {
  it('formats correctly for path with 1 required param', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id/classes', { facility_id: 109000000 }),
    ).toEqual('/en/facility/#/109000000/classes');
  });

  it('formats correctly for path with required param not provided', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id/classes', { facility_id: undefined }),
    ).toEqual('/en/facility/');
  });

  it('formats correctly for path with 1 optional param', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id?/classes', { facility_id: 109099999 }),
    ).toEqual('/en/facility/#/109099999/classes');
  });

  it('formats correctly for path with optional param not provided', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id?/classes', { facility_id: undefined }),
    ).toEqual('/en/facility/#/classes');
  });

  it('formats correctly for path with required param when wrong param provided', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id/classes', { device_id: 900034 }),
    ).toEqual('/en/facility/');
  });

  it('formats correctly for path with optional param when wrong param provided', () => {
    expect(
      generateNavRoute('/en/facility/', '/:facility_id?/classes', { device_id: 900034 }),
    ).toEqual('/en/facility/#/classes');
  });
});
