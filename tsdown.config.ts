import { defineConfig } from "tsdown";

export default defineConfig({
    workspace: "packages/*",
    dts: true,
    entry: ["src/*/index.ts"],
    exports: true,
    unbundle: true,
});
