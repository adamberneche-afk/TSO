// Jest-only stand-in for chalk (ESM-only as of v5+, which Jest's CJS
// module loader can't parse -- see jest.config.js). Every chained style
// call (chalk.blue.bold('x')) just returns its input unstyled, since
// these tests don't assert on ANSI output.
const identity = (...args) => args.join(' ');
const styler = new Proxy(identity, {
  get: () => styler,
});

module.exports = styler;
module.exports.default = styler;
