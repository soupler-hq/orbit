#!/usr/bin/env node

/**
 * Orbit Orchestrator v1.0
 * Automates parallel subagent execution and output aggregation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OrbitOrchestrator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.registryPath = path.join(projectRoot, 'orbit.registry.json');
    this.stateDir = path.join(projectRoot, '.orbit', 'state');
    this.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
  }

  /**
   * Dispatches a wave of tasks to parallel subagents.
   * @param {Array} tasks - Array of task objects { agent: string, prompt: string }
   */
  async executeWave(tasks) {
    console.log(`\n🚀 Starting Wave with ${tasks.length} agents...\n`);
    
    const results = await Promise.all(tasks.map(async (task, index) => {
      const agent = this.registry.agents.find(a => a.name === task.agent);
      if (!agent) throw new Error(`Agent ${task.agent} not found in registry`);

      console.log(`[${task.agent}] Initializing...`);
      
      // In a real environment, this would call the subagent API.
      // Here we simulate the process by creating the task context and expecting a SUMMARY.md
      const taskDir = path.join(this.stateDir, `task_${Date.now()}_${index}`);
      fs.mkdirSync(taskDir, { recursive: true });
      
      fs.writeFileSync(path.join(taskDir, 'INSTRUCTIONS.md'), task.prompt);
      
      return {
        agent: task.agent,
        status: 'DISPATCHED',
        context: taskDir
      };
    }));

    return results;
  }

  /**
   * Aggregates SUMMARY.md files from completed subtasks.
   * @param {string} waveId - Identifier for the wave (matching the prefix of task dirs)
   */
  aggregateResults(waveId) {
    console.log(`\n📊 Aggregating results for wave ${waveId}...\n`);
    
    const taskDirs = fs.readdirSync(this.stateDir)
      .filter(d => d.startsWith(`task_${waveId}`))
      .map(d => path.join(this.stateDir, d));

    let finalSummary = `# Wave Summary: ${waveId}\n\n`;
    let foundAny = false;

    for (const dir of taskDirs) {
      const summaryPath = path.join(dir, 'SUMMARY.md');
      if (fs.existsSync(summaryPath)) {
        const content = fs.readFileSync(summaryPath, 'utf8');
        const agentName = path.basename(dir).split('_')[0]; // Simple heuristic
        finalSummary += `## Agent: ${agentName}\n${content}\n\n---\n\n`;
        foundAny = true;
      }
    }

    if (!foundAny) {
      console.warn("⚠️ No SUMMARY.md files found to aggregate.");
      return null;
    }

    const outputPath = path.join(this.stateDir, `WAVE_${waveId}_SUMMARY.md`);
    fs.writeFileSync(outputPath, finalSummary);
    console.log(`✅ Wave summary written to ${outputPath}`);
    return finalSummary;
  }
}

// CLI Entry Point
if (require.main === module) {
  const orchestrator = new OrbitOrchestrator(process.cwd());
  // Example usage: node orchestrator.js --wave="[{'agent': 'engineer', 'prompt': '...'}, ...]"
  console.log("Orbit Orchestrator ready.");
}

module.exports = OrbitOrchestrator;
