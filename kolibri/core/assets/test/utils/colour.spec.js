import { lighten, darken } from '../../src/utils/colour';

describe('colour utils', () => {
  describe('lighten function', () => {
    it('should lighten a colour using a ratio', () => {
      expect(lighten('#555555', 0.1)).toEqual('rgb(94, 94, 94)');
    });
    it('should lighten a colour using a percentage', () => {
      expect(lighten('#555555', '10%')).toEqual('rgb(94, 94, 94)');
    });
  });
  describe('darken function', () => {
    it('should darken a colour using a ratio', () => {
      expect(darken('#555555', 0.1)).toEqual('rgb(77, 77, 77)');
    });
    it('should darken a colour using a percentage', () => {
      expect(darken('#555555', '10%')).toEqual('rgb(77, 77, 77)');
    });
  });
});
