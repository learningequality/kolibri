import xAPIShim from './xAPIShim';

describe('xAPIShim', () => {
  let shim;
  let mockMediator;

  beforeEach(() => {
    mockMediator = {
      registerMessageHandler: jest.fn(),
      sendMessage: jest.fn(),
    };
    shim = new xAPIShim(mockMediator);
    shim.userData = { userId: 'testuser' };
  });

  describe('getStatements with related_agents filter', () => {
    // Regression test for bug: statements.filter(statements, orFilter)
    // should be statements.filter(orFilter)
    // The first argument to Array.filter should be a callback, not the array itself
    it('should not throw TypeError when filtering with related_agents', () => {
      const statement = {
        id: 'stmt-1',
        verb: { id: 'http://example.com/verb' },
        object: { mbox: 'mailto:test@example.com' },
      };
      shim.data = { statement: [statement] };

      // This should not throw - exercises the orFilter code path
      expect(() => {
        shim.getStatements({
          agent: { mbox: 'mailto:other@example.com' },
          related_agents: true,
        });
      }).not.toThrow();
    });
  });

  describe('actorsEqual (via getStatements)', () => {
    // Regression test for bug: actor2.openid === actor2.openid
    // should be actor1.openid === actor2.openid
    it('should correctly compare actors by openid', () => {
      // Store a statement with an object that has an openid
      const actorWithOpenId = { openid: 'https://example.com/user1' };
      const statement = {
        id: 'stmt-1',
        verb: { id: 'http://example.com/verb' },
        object: actorWithOpenId,
      };
      shim.data = { statement: [statement] };

      // Search for statements with a DIFFERENT openid actor
      // This should NOT match because the openids are different
      const differentActor = { openid: 'https://example.com/user2' };
      const results = shim.getStatements({
        agent: differentActor,
        related_agents: true,
      });

      // BUG: Currently this returns the statement because actorsEqual
      // compares actor2.openid === actor2.openid (always true)
      // instead of actor1.openid === actor2.openid
      expect(results).toEqual([]);
    });

    it('should match actors with the same openid', () => {
      const actorWithOpenId = { openid: 'https://example.com/user1' };
      const statement = {
        id: 'stmt-1',
        verb: { id: 'http://example.com/verb' },
        object: actorWithOpenId,
      };
      shim.data = { statement: [statement] };

      // Search with the SAME openid - should match
      const sameActor = { openid: 'https://example.com/user1' };
      const results = shim.getStatements({
        agent: sameActor,
        related_agents: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('stmt-1');
    });

    it('should correctly compare actors by mbox', () => {
      const actorWithMbox = { mbox: 'mailto:user1@example.com' };
      const statement = {
        id: 'stmt-1',
        verb: { id: 'http://example.com/verb' },
        object: actorWithMbox,
      };
      shim.data = { statement: [statement] };

      // Different mbox should not match
      const differentActor = { mbox: 'mailto:user2@example.com' };
      const results = shim.getStatements({
        agent: differentActor,
        related_agents: true,
      });

      expect(results).toEqual([]);
    });
  });
});
