const { readConfig } = require('../src/config');

describe('readConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults all staged flags to false', () => {
    delete process.env.USE_DB;
    delete process.env.USE_QUEUE;
    delete process.env.ADAPTIVE_FOLLOWUPS;
    const c = readConfig();
    expect(c.useDb).toBe(false);
    expect(c.useQueue).toBe(false);
    expect(c.adaptiveFollowups).toBe(false);
  });

  it('accepts USE_DB=1', () => {
    process.env.USE_DB = '1';
    expect(readConfig().useDb).toBe(true);
  });

  it('accepts TRUST_SERVER_STT=1', () => {
    process.env.TRUST_SERVER_STT = '1';
    expect(readConfig().trustServerStt).toBe(true);
  });
});
