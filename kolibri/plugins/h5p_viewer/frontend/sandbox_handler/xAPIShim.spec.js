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

  describe('sendStatement', () => {
    it('should store a statement that failed validation rather than drop it', async () => {
      // Statement.clean rejects a statement with no object, and H5P only ever sends
      // compress = true - the compress path must not dereference what is not there.
      const debug = jest.spyOn(console, 'debug').mockImplementation();
      const contentWindow = {};
      shim.initialize(contentWindow);

      await contentWindow.xAPI.sendStatement({ verb: { id: 'http://example.com/verb' } }, true);

      expect(shim.data.statement).toHaveLength(1);
      expect(shim.data.statement[0].error).toEqual(expect.any(String));
      debug.mockRestore();
    });

    it('should drop the reconstructable fields of a valid compressed statement', async () => {
      const contentWindow = {};
      shim.initialize(contentWindow);

      await contentWindow.xAPI.sendStatement(
        {
          verb: { id: 'http://example.com/verb', display: { 'en-US': 'did' } },
          object: { id: 'http://example.com/activity', objectType: 'Activity' },
        },
        true,
      );

      expect(shim.data.statement[0].error).toBeUndefined();
      expect(shim.data.statement[0]).not.toHaveProperty('actor');
      expect(shim.data.statement[0]).not.toHaveProperty('object');
    });
  });

  describe('getStatements with related_agents filter', () => {
    it('should skip a stored statement that sendStatement compressed away the object of', () => {
      shim.data = {
        statement: [
          { id: 'stmt-1', verb: { id: 'http://example.com/verb' } },
          {
            id: 'stmt-2',
            verb: { id: 'http://example.com/verb' },
            object: { mbox: 'mailto:test@example.com' },
          },
        ],
      };

      const results = shim.getStatements({
        agent: { mbox: 'mailto:test@example.com' },
        related_agents: true,
      });

      expect(results.map(s => s.id)).toEqual(['stmt-2']);
    });
  });

  describe('getStatements with both related filters', () => {
    it('should require a statement to satisfy the agent and the activity', () => {
      shim.data = {
        statement: [
          {
            id: 'agent-only',
            verb: { id: 'http://example.com/verb' },
            actor: { mbox: 'mailto:test@example.com' },
            object: { id: 'http://example.com/other', objectType: 'Activity' },
          },
          {
            id: 'activity-only',
            verb: { id: 'http://example.com/verb' },
            actor: { mbox: 'mailto:someone@example.com' },
            object: { id: 'http://example.com/activity', objectType: 'Activity' },
          },
          {
            id: 'both',
            verb: { id: 'http://example.com/verb' },
            actor: { mbox: 'mailto:test@example.com' },
            object: { id: 'http://example.com/activity', objectType: 'Activity' },
          },
        ],
      };

      const results = shim.getStatements({
        agent: { mbox: 'mailto:test@example.com' },
        related_agents: true,
        activity: 'http://example.com/activity',
        related_activities: true,
      });

      expect(results.map(s => s.id)).toEqual(['both']);
    });
  });

  describe('getStatements with related_activities filter', () => {
    it('should match an activity inside a SubStatement and skip a compressed statement', () => {
      shim.data = {
        statement: [
          { id: 'stmt-1', verb: { id: 'http://example.com/verb' } },
          {
            id: 'stmt-2',
            verb: { id: 'http://example.com/verb' },
            object: {
              objectType: 'SubStatement',
              object: { id: 'http://example.com/activity', objectType: 'Activity' },
            },
          },
          {
            id: 'stmt-3',
            verb: { id: 'http://example.com/verb' },
            object: { id: 'http://example.com/other', objectType: 'Activity' },
          },
        ],
      };

      const results = shim.getStatements({
        activity: 'http://example.com/activity',
        related_activities: true,
      });

      expect(results.map(s => s.id)).toEqual(['stmt-2']);
    });

    it('should not run the or-filter over statements that failed validation', () => {
      shim.data = {
        statement: [
          {
            id: 'stmt-errored',
            verb: { id: 'http://example.com/verb' },
            object: { id: 'http://example.com/other', objectType: 'Activity' },
            // Uncoerced by Statement.clean: the spec's single-object form, not an array.
            context: { contextActivities: { parent: { id: 'http://example.com/activity' } } },
            error: 'invalid statement',
          },
          {
            id: 'stmt-good',
            verb: { id: 'http://example.com/verb' },
            object: { id: 'http://example.com/activity', objectType: 'Activity' },
          },
        ],
      };

      const results = shim.getStatements({
        activity: 'http://example.com/activity',
        related_activities: true,
      });

      expect(results.map(s => s.id)).toEqual(['stmt-good']);
    });
  });

  describe('getStatements without an or-filter', () => {
    it('should return every statement when no related_* filter is given', () => {
      shim.data = {
        statement: [
          { id: 'stmt-1', verb: { id: 'http://example.com/verb' }, object: { id: 'a' } },
          { id: 'stmt-2', verb: { id: 'http://example.com/verb' }, object: { id: 'b' } },
        ],
      };

      const results = shim.getStatements({});

      expect(results.map(s => s.id)).toEqual(['stmt-1', 'stmt-2']);
    });

    it('should still narrow by verb when no related_* filter is given', () => {
      shim.data = {
        statement: [
          { id: 'stmt-1', verb: { id: 'http://example.com/answered' }, object: { id: 'a' } },
          { id: 'stmt-2', verb: { id: 'http://example.com/attempted' }, object: { id: 'b' } },
        ],
      };

      const results = shim.getStatements({ verb: 'http://example.com/answered' });

      expect(results.map(s => s.id)).toEqual(['stmt-1']);
    });
  });

  describe('actorsEqual (via getStatements)', () => {
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

    it('should not match accounts that differ only by name', () => {
      shim.data = {
        statement: [
          {
            id: 'stmt-1',
            verb: { id: 'http://example.com/verb' },
            object: { account: { homePage: 'https://example.com', name: 'user1' } },
          },
        ],
      };

      const results = shim.getStatements({
        agent: { account: { homePage: 'https://example.com', name: 'user2' } },
        related_agents: true,
      });

      expect(results).toEqual([]);
    });

    it('should match accounts with the same homePage and name', () => {
      shim.data = {
        statement: [
          {
            id: 'stmt-1',
            verb: { id: 'http://example.com/verb' },
            object: { account: { homePage: 'https://example.com', name: 'user1' } },
          },
        ],
      };

      const results = shim.getStatements({
        agent: { account: { homePage: 'https://example.com', name: 'user1' } },
        related_agents: true,
      });

      expect(results.map(s => s.id)).toEqual(['stmt-1']);
    });
  });
});
