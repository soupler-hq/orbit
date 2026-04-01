#!/usr/bin/env node

/**
 * Orbit Orchestrator v2.0
 * Automates parallel subagent execution, task isolation, and output aggregation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  formatNextCommand,
  formatProgressStatus,
  formatWorkflowGate,
  formatWaveComplete,
  formatWaveStart,
} = require('./status');
const {
  assertPullRequestReady,
  assertWorkflowTransition,
  evaluateWorkflowState,
} = require('./workflow-state');

class OrbitOrchestrator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.registryPath = path.join(projectRoot, 'orbit.registry.json');
    this.configPath = path.join(projectRoot, 'orbit.config.json');
    this.stateDir = path.join(projectRoot, '.orbit', 'state');

    this.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
    this.config = fs.existsSync(this.configPath)
      ? JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
      : { models: { routing: 'auto' }, git: { worktree_per_task: false } };

    // Nexus Consciousness (Task 2.3)
    this.nexusPath = path.join(projectRoot, 'orbit.nexus.json');
    this.isNexus = fs.existsSync(this.nexusPath);
    this.nexus = this.isNexus ? JSON.parse(fs.readFileSync(this.nexusPath, 'utf8')) : null;
  }

  /**
   * Resolve the best model for a task based on the agent registry and routing aliases.
   * Falls back to the implement profile so older fixtures remain compatible.
   */
  resolveModelForAgent(agent) {
    const primaryDomain = (agent.domains && agent.domains[0]) || agent.domain || '';
    const domainToProfile = {
      ENGINEERING: 'implement',
      REVIEW: 'implement',
      OPERATIONS: 'implement',
      DESIGN: 'implement',
      PRODUCT: 'implement',
      RESEARCH: 'architect',
      SYNTHESIS: 'architect',
      SECURITY: 'security',
    };
    const agentToRoutingAlias = {
      architect: 'reasoning',
      strategist: 'reasoning',
      researcher: 'reasoning',
      forge: 'reasoning',
      'security-engineer': 'security',
      'safety-evaluator': 'security',
      engineer: 'standard',
      reviewer: 'standard',
      devops: 'standard',
      designer: 'standard',
      'data-engineer': 'standard',
    };

    const profileKey = domainToProfile[String(primaryDomain).toUpperCase()] || 'implement';
    const routingAlias = agentToRoutingAlias[agent.name] || 'standard';

    return (
      this.config.models?.routing?.[routingAlias] ||
      this.config.models?.profiles?.[profileKey]?.model ||
      this.config.models?.profiles?.implement?.model ||
      'claude-sonnet-4-6'
    );
  }

  /**
   * Acquire an atomic lock on the state directory.
   */
  acquireStateLock() {
    const lockPath = path.join(this.stateDir, '.orbit.lock');
    let attempts = 0;
    while (attempts < 10) {
      try {
        fs.mkdirSync(lockPath);
        return true;
      } catch (_e) {
        attempts++;
        execSync('sleep 0.1');
      }
    }
    throw new Error(
      '[ERR-ORBIT-003] Could not acquire Orbit state lock after 10 retries. Delete .orbit/state/.orbit.lock if the lock is stale.'
    );
  }

  /**
   * Release the atomic lock.
   */
  releaseStateLock() {
    const lockPath = path.join(this.stateDir, '.orbit.lock');
    try {
      fs.rmdirSync(lockPath);
    } catch (_e) {
      // Ignore if already gone
    }
  }

  /**
   * Sets up a Git worktree for task isolation if configured.
   */
  setupWorktree(taskName, branchName) {
    if (!this.config.git?.worktree_per_task) return this.projectRoot;

    const worktreePath = path.join(this.projectRoot, '.worktrees', taskName);
    console.log(`[Git] Creating worktree at ${worktreePath}...`);
    try {
      execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, { stdio: 'pipe' });
      return worktreePath;
    } catch (e) {
      console.warn(
        `⚠️  Worktree failed (maybe branch exists?), falling back to root: ${e.message}`
      );
      return this.projectRoot;
    }
  }

  /**
   * Resolves a path across the Nexus workspace.
   */
  resolveNexusPath(repoName, relativePath) {
    if (!this.isNexus) return path.join(this.projectRoot, relativePath);
    const repo = this.nexus.repos.find((r) => r.name === repoName);
    if (!repo)
      throw new Error(
        `[ERR-ORBIT-006] Repo ${repoName} not found in Nexus registry. Run: node bin/install.js nexus sync`
      );
    return path.resolve(this.projectRoot, repo.path, relativePath);
  }

  /**
   * Evaluates the current tracked workflow state for a task or branch.
   */
  evaluateWorkflow(evidence) {
    return evaluateWorkflowState(evidence);
  }

  /**
   * Ensures the requested transition is the next valid workflow move.
   */
  assertWorkflowTransition(targetState, evidence) {
    return assertWorkflowTransition(targetState, evidence);
  }

  /**
   * Blocks PR creation until tests and review gates are satisfied.
   */
  assertPullRequestReady(evidence) {
    return assertPullRequestReady(evidence);
  }

  /**
   * Renders the workflow gate block for status output.
   */
  renderWorkflowGate(evidence) {
    return formatWorkflowGate(this.evaluateWorkflow(evidence));
  }

  /**
   * Dispatches a wave of tasks to parallel subagents.
   */
  async executeWave(tasks, waveId = Date.now().toString()) {
    console.log(formatWaveStart({ wave: waveId, taskCount: tasks.length }));
    console.log(`\n🚀 Starting Wave ${waveId} with ${tasks.length} agents...\n`);

    const results = await Promise.all(
      tasks.map(async (task, index) => {
        const agent = this.registry.agents.find((a) => a.name === task.agent);
        if (!agent)
          throw new Error(
            `[ERR-ORBIT-004] Agent '${task.agent}' not found in registry at ≥60% match. Run /orbit:forge to create a specialist agent.`
          );

        // 1. Model Routing Enforcement (Task 2.1)
        const modelEnv = this.resolveModelForAgent(agent);

        // 2. Git Worktree Handoff (Task 2.2)
        const taskName = `task_${waveId}_${index}`;
        const branchName = `feat/orbit-task-${waveId}-${index}`;
        const executionPath = this.setupWorktree(taskName, branchName);

        // 3. Context Creation
        const taskDir = path.join(this.stateDir, taskName);
        fs.mkdirSync(taskDir, { recursive: true });
        fs.writeFileSync(path.join(taskDir, 'INSTRUCTIONS.md'), task.prompt);
        fs.writeFileSync(
          path.join(taskDir, 'METADATA.json'),
          JSON.stringify(
            {
              agent: task.agent,
              model: modelEnv,
              path: executionPath,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        console.log(`[${task.agent}] Dispatched (Model: ${modelEnv}, Path: ${executionPath})`);
        console.log(
          formatProgressStatus({
            command: `wave ${waveId}`,
            agent: task.agent,
            wave: waveId,
            status: 'dispatched',
            details: path.basename(executionPath),
          })
        );
        if (task.issue) {
          console.log(
            this.renderWorkflowGate({
              issue: task.issue,
              branch: branchName,
              implementationStatus: 'in_progress',
              testsStatus: 'not_run',
              reviewStatus: 'not_requested',
              prStatus: 'not_open',
            })
          );
        }

        return {
          agent: task.agent,
          status: 'DISPATCHED',
          context: taskDir,
          model: modelEnv,
        };
      })
    );

    return results;
  }

  /**
   * Aggregates SUMMARY.md files with atomic locking (Task 1.2).
   */
  aggregateResults(waveId) {
    this.acquireStateLock();
    try {
      console.log(`\n📊 Aggregating results for wave ${waveId}...\n`);

      const taskDirs = fs
        .readdirSync(this.stateDir)
        .filter((d) => d.startsWith(`task_${waveId}`))
        .map((d) => path.join(this.stateDir, d));

      let finalSummary = `# Wave Summary: ${waveId}\n\n`;
      let foundAny = false;
      let consensusMet = true;

      for (const dir of taskDirs) {
        const summaryPath = path.join(dir, 'SUMMARY.md');
        if (fs.existsSync(summaryPath)) {
          const content = fs.readFileSync(summaryPath, 'utf8');
          const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'METADATA.json'), 'utf8'));

          // Consensus Pattern: Check for Approval in Reviewer/Security summaries
          if (
            (metadata.agent === 'reviewer' || metadata.agent === 'security-engineer') &&
            !content.includes('APPROVED')
          ) {
            console.warn(`🛡️  Consensus Warning: ${metadata.agent} has NOT approved the wave.`);
            consensusMet = false;
          }

          finalSummary += `## Agent: ${metadata.agent}\n- Model: ${metadata.model}\n- Path: ${metadata.path}\n\n${content}\n\n---\n\n`;
          foundAny = true;
        }
      }

      if (!foundAny) {
        console.warn('⚠️ No SUMMARY.md files found to aggregate.');
        return null;
      }

      const status = consensusMet ? '✅ CONSENSUS MET' : '❌ CONSENSUS FAILED';
      finalSummary = `${status}\n\n` + finalSummary;

      const outputPath = path.join(this.stateDir, `WAVE_${waveId}_SUMMARY.md`);
      fs.writeFileSync(outputPath, finalSummary);
      console.log(`${status}. Wave summary written to ${outputPath}`);
      console.log(
        formatWaveComplete({
          wave: waveId,
          completed: foundAny ? taskDirs.length : 0,
          blocked: consensusMet ? 0 : 1,
          next: 'Run /orbit:verify before shipping',
        })
      );
      console.log(
        formatNextCommand({
          primary: '/orbit:verify',
          why: 'Wave output is ready for verification before shipping.',
          alternatives: [
            '/orbit:progress — review full milestone status',
            '/orbit:resume — reload state if another session updated it',
          ],
        })
      );
      return finalSummary;
    } finally {
      this.releaseStateLock();
    }
  }
}

// CLI Entry Point
if (require.main === module) {
  const orchestrator = new OrbitOrchestrator(process.cwd());
  const args = process.argv.slice(2);

  if (args[0] === '--wave') {
    const tasks = JSON.parse(args[1]);
    orchestrator.executeWave(tasks);
  } else {
    console.log('Orbit Orchestrator v2.0');
    console.log("Usage: node orchestrator.js --wave=\"[{'agent': 'engineer', 'prompt': '...'}]\"");
  }
}

module.exports = OrbitOrchestrator;
