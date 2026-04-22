import { parseAnswerStateInput } from '../QTISandboxPage.vue';

describe('QTISandboxPage', () => {
  describe('parseAnswerStateInput', () => {
    it('parses a JSON object so record responses round-trip', () => {
      expect(parseAnswerStateInput('{"correct":true,"simpleAnswer":"42"}')).toEqual({
        correct: true,
        simpleAnswer: '42',
      });
    });

    it('parses a JSON array so container responses round-trip', () => {
      expect(parseAnswerStateInput('["choice_a","choice_b"]')).toEqual(['choice_a', 'choice_b']);
    });

    it('keeps a non-JSON scalar string as its raw value', () => {
      expect(parseAnswerStateInput('choice_a')).toBe('choice_a');
    });

    it('keeps an empty string as an empty string', () => {
      expect(parseAnswerStateInput('')).toBe('');
    });

    it('keeps a numeric string raw so downstream coercion decides its type', () => {
      expect(parseAnswerStateInput('42')).toBe('42');
    });
  });
});
