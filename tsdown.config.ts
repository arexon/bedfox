import { defineConfig } from "tsdown";

export default defineConfig({
    workspace: "packages/*",
    dts: true,
    entry: ["src/*/index.ts", "src/*.ts"],
    exports: true,
    unbundle: true,
});
