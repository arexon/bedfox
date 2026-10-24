import { basename, dirname, join } from "node:path";
import { snapshot } from "node:test";

snapshot.setResolveSnapshotPath((testFile) => {
    if (testFile === undefined) throw new Error("Snapshots need a test file");
    return join(dirname(testFile), "__snapshots__", `${basename(testFile)}.snap`);
});
