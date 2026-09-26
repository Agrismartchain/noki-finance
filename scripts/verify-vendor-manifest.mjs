import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "vendor", "manifest.json");

function fail(message) {
  process.stderr.write(`vendor manifest verification failed: ${message}\n`);
  process.exitCode = 1;
}

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];

  if (packages.length !== 2) {
    fail("expected exactly 2 vendored packages.");
  }

  const expected = new Map([
    ["@agrismartchain/noki-design-system", "0.2.1"],
    ["@agrismartchain/noki-shared-contracts", "0.31.0"],
  ]);

  for (const entry of packages) {
    if (!entry || typeof entry !== "object") {
      fail("package entry must be an object.");
      continue;
    }

    const expectedVersion = expected.get(entry.name);
    if (expectedVersion === undefined) {
      fail(`unexpected package ${String(entry.name)}.`);
      continue;
    }

    if (entry.version !== expectedVersion) {
      fail(`${entry.name} version must be ${expectedVersion}.`);
    }

    if (typeof entry.sourceCommit !== "string" || !/^[0-9a-f]{40}$/.test(entry.sourceCommit)) {
      fail(`${entry.name} sourceCommit must be a full Git SHA.`);
    }

    if (typeof entry.file !== "string" || !entry.file.endsWith(".tgz") || entry.file.includes("/")) {
      fail(`${entry.name} file must be a tarball basename.`);
      continue;
    }

    if (typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      fail(`${entry.name} sha256 must be a lowercase sha256 digest.`);
      continue;
    }

    const actual = await sha256(path.join(root, "vendor", entry.file));
    if (actual !== entry.sha256) {
      fail(`${entry.file} sha256 mismatch.`);
    }

    expected.delete(entry.name);
  }

  for (const missing of expected.keys()) {
    fail(`missing package ${missing}.`);
  }

  if (process.exitCode === undefined) {
    process.stdout.write("Vendor manifest verification passed.\n");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
