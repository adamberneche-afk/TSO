// Regression test for the vm2 allowAsync/fixAsync conflict: vm2 forces
// allowAsync to false whenever fixAsync is also true, but every skill is
// wrapped in an async IIFE regardless of that setting -- so with both
// flags set, execution threw "Async not available" before running a
// single line of skill code, every time.

import { SandboxService } from '../SandboxService';
import { Permission } from '@think/types';

describe('SandboxService.executeSkill', () => {
  const permissions: Permission = {
    env_vars: [],
    modules: [],
  };

  it('actually runs an async skill instead of throwing "Async not available"', async () => {
    const sandbox = new SandboxService(permissions);

    const result = await sandbox.executeSkill(`
      async function compute() {
        return 1 + 1;
      }
      return await compute();
    `);

    expect(result.success).toBe(true);
    expect(result.result).toBe(2);
  });

  it('still enforces the execution timeout on a runaway skill', async () => {
    const sandbox = new SandboxService(permissions);

    const result = await sandbox.executeSkill(
      `while (true) {}`,
      200,
    );

    expect(result.success).toBe(false);
  });
});
