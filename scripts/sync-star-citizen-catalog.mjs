import { spawn } from "node:child_process";

const steps = [
  ["import:sources", ["run", "import:sources"]],
  ["export:json", ["run", "export:json"]],
  ["export:split", ["run", "export:split"]],
  ["validate:data", ["run", "validate:data"]]
];

function runStep(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`[sync:start] ${label}`);

    const child = spawn("npm", args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`[sync:done] ${label}`);
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function run() {
  for (const [label, args] of steps) {
    await runStep(label, args);
  }

  console.log("Catalog sync complete");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});