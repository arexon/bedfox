import { env } from "node:process";

import { configDefaults, defineConfig } from "vite-plus";

export default defineConfig({
    fmt: {
        jsdoc: true,
        proseWrap: "always",
        sortImports: true,
        tabWidth: 4,
    },
    lint: {
        categories: {
            correctness: "warn",
            perf: "warn",
            suspicious: "warn",
            nursery: "warn",
        },
        options: {
            denyWarnings: env.CI === "true",
            typeAware: true,
            typeCheck: true,
        },
        overrides: [
            {
                // Empty decorated classes are what some serialize tests check.
                files: ["packages/*/tests/**"],
                rules: { "typescript/no-extraneous-class": "off" },
            },
        ],
        plugins: ["eslint", "import", "jsdoc", "oxc", "typescript", "unicorn", "vitest"],
        rules: {
            "no-restricted-imports": [
                "warn",
                {
                    patterns: [
                        {
                            group: ["./*", "../*"],
                            message: "Use the `#/` subpath alias instead of relative imports.",
                        },
                    ],
                },
            ],
            "no-shadow": "off",
            "no-underscore-dangle": "off",
            "typescript/no-unsafe-type-assertion": "off",
        },
    },
    pack: {
        dts: true,
        entry: ["src/index.ts", "src/*/index.ts", "src/*.ts", "!src/_*"],
        exports: true,
        unbundle: true,
    },
    test: {
        exclude: [...configDefaults.exclude, ".direnv/**"],
    },
});
