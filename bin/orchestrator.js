#!/usr/bin/env node

/**
 * Orbit Orchestrator v2.0
 * Automates parallel subagent execution, task isolation, and output aggregation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    throw new Error('Could not acquire Orbit state lock');
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
      console.warn(`⚠️  Worktree failed (maybe branch exists?), falling back to root: ${e.message}`);
      return this.projectRoot;
    }
  }

  /**
   * Resolves a path across the Nexus workspace.
   */
  resolveNexusPath(repoName, relativePath) {
    if (!this.isNexus) return path.join(this.projectRoot, relativePath);
    const repo = this.nexus.repos.find(r => r.name === repoName);
    if (!repo) throw new Error(`Repo ${repoName} not found in Nexus registry`);
    return path.resolve(this.projectRoot, repo.path, relativePath);
  }

  /**
   * Dispatches a wave of tasks to parallel subagents.
   */
  async executeWave(tasks, waveId = Date.now().toString()) {
    console.log(`\n🚀 Starting Wave ${waveId} with ${tasks.length} agents...\n`);
    
    const results = await Promise.all(tasks.map(async (task, index) => {
      const agent = this.registry.agents.find(a => a.name === task.agent);
      if (!agent) throw new Error(`Agent ${task.agent} not found in registry`);

      // 1. Model Routing Enforcement (Task 2.1)
      const profile = this.config.models?.profiles?.[agent.domain] || this.config.models?.profiles?.implement;
      const modelEnv = profile ? profile.model : 'claude-sonnet-4-6';

      // 2. Git Worktree Handoff (Task 2.2)
      const taskName = `task_${waveId}_${index}`;
      const branchName = `orbit/${taskName}`;
      const executionPath = this.setupWorktree(taskName, branchName);

      // 3. Context Creation
      const taskDir = path.join(this.stateDir, taskName);
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'INSTRUCTIONS.md'), task.prompt);
      fs.writeFileSync(path.join(taskDir, 'METADATA.json'), JSON.stringify({
        agent: task.agent,
        model: modelEnv,
        path: executionPath,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log(`[${task.agent}] Dispatched (Model: ${modelEnv}, Path: ${executionPath})`);
      
      return {
        agent: task.agent,
        status: 'DISPATCHED',
        context: taskDir,
        model: modelEnv
      };
    }));

    return results;
  }

  /**
   * Aggregates SUMMARY.md files with atomic locking (Task 1.2).
   */
  aggregateResults(waveId) {
    this.acquireStateLock();
    try {
      console.log(`\n📊 Aggregating results for wave ${waveId}...\n`);
      
      const taskDirs = fs.readdirSync(this.stateDir)
        .filter(d => d.startsWith(`task_${waveId}`))
        .map(d => path.join(this.stateDir, d));

      let finalSummary = `# Wave Summary: ${waveId}\n\n`;
      let foundAny = false;
      let consensusMet = true;

      for (const dir of taskDirs) {
        const summaryPath = path.join(dir, 'SUMMARY.md');
        if (fs.existsSync(summaryPath)) {
          const content = fs.readFileSync(summaryPath, 'utf8');
          const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'METADATA.json'), 'utf8'));
          
          // Consensus Pattern: Check for Approval in Reviewer/Security summaries
          if ((metadata.agent === 'reviewer' || metadata.agent === 'security-engineer') && !content.includes('APPROVED')) {
            console.warn(`🛡️  Consensus Warning: ${metadata.agent} has NOT approved the wave.`);
            consensusMet = false;
          }

          finalSummary += `## Agent: ${metadata.agent}\n- Model: ${metadata.model}\n- Path: ${metadata.path}\n\n${content}\n\n---\n\n`;
          foundAny = true;
        }
      }

      if (!foundAny) {
        console.warn("⚠️ No SUMMARY.md files found to aggregate.");
        return null;
      }

      const status = consensusMet ? '✅ CONSENSUS MET' : '❌ CONSENSUS FAILED';
      finalSummary = `${status}\n\n` + finalSummary;

      const outputPath = path.join(this.stateDir, `WAVE_${waveId}_SUMMARY.md`);
      fs.writeFileSync(outputPath, finalSummary);
      console.log(`${status}. Wave summary written to ${outputPath}`);
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
    console.log("Orbit Orchestrator v2.0");
    console.log("Usage: node orchestrator.js --wave=\"[{'agent': 'engineer', 'prompt': '...'}]\"");
  }
}

module.exports = OrbitOrchestrator;
