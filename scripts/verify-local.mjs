import { access, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  "README.md",
  "SUBMISSION.md",
  "REAL_INFRA.md",
  "REPO.md",
  "index.html",
  "src/main.jsx",
  "src/styles.css",
  "src/risk-engine.js",
  "src/dapp-kit.js",
  "src/deepbook-client.js",
  "src/guard-tx.js",
  "src/demo-state.js",
  "src/proof-links.js",
  "src/integrations/config.js",
  "src/integrations/sui.js",
  "src/integrations/deepbook.js",
  "tests/risk-engine.test.mjs",
  "tests/deepbook-client.test.mjs",
  "tests/guard-tx.test.mjs",
  "tests/demo-state.test.mjs",
  "tests/proof-links.test.mjs",
  "tests/testnet-integration-runner.test.mjs",
  "scripts/check-sui.mjs",
  "scripts/testnet-integration.mjs",
  "scripts/publish-move.sh",
  ".env.example",
  "media/deepbook-risk-console.svg",
  "media/deepbook-risk-console.mp4",
  "media/deepbook-risk-console.hyperframes.mp4",
  "media/deepbook-risk-console.voice.txt",
  "media/deepbook-risk-console.en.srt",
  "media/deepbook-risk-console.zh.srt",
  "media/deepbook-risk-console.bilingual.vtt",
  "media/deepbook-risk-console.image2.json",
  "move/Move.toml",
  "move/sources/deepbook_risk_console.move",
  "hyperframes/index.html",
  "hyperframes/DESIGN.md"
];

for (const file of requiredFiles) {
  await access(file);
}

const video = await stat('media/deepbook-risk-console.hyperframes.mp4');
if (video.size < 100_000) {
  throw new Error('Rendered HyperFrames video is unexpectedly small.');
}

run('npm', ['run', 'test:risk']);
run('npm', ['run', 'test:client']);
run('npm', ['run', 'test:guard-tx']);
run('npm', ['run', 'test:demo-state']);
run('npm', ['run', 'test:proof-links']);
run('npm', ['run', 'test:integration-runner']);
run('npm', ['run', 'build']);
run('sui', ['move', 'build', '--path', 'move', '--build-env', 'testnet', '--warnings-are-errors']);

console.log('Standalone verification passed for deepbook-risk-console.');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}
