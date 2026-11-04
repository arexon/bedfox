import { defineConfig } from "vite-plus";

const TEST_PAT = "packages/*/src/**/*.test.ts";

export default defineConfig({
    test: {
        include: [TEST_PAT],
    },
    pack: {
        dts: true,
        entry: ["src/index.ts", "src/*/index.ts", "!src/**/*.test.ts"],
        exports: { devExports: true },
        unbundle: true,
    },
    fmt: {
        jsdoc: true,
        proseWrap: "always",
        sortImports: true,
        tabWidth: 4,
    },
    lint: {
        categories: {
            correctness: "warn",
            nursery: "warn",
            perf: "warn",
            suspicious: "warn",
            pedantic: "error",
        },
        options: { typeAware: true, typeCheck: true },
        plugins: ["eslint", "jsdoc", "oxc", "typescript", "unicorn"],
        overrides: [
            {
                files: ["packages/*/src/**"],
                rules: {
                    "no-restricted-imports": [
                        "warn",
                        {
                            patterns: [
                                {
                                    group: ["./*", "../*"],
                                    message:
                                        "Use the `#/` subpath alias instead of relative imports.",
                                },
                                {
                                    group: [
                                        "#/index",
                                        "#/component/index",
                                        "#/definition/index",
                                        "#/feature/index",
                                    ],
                                    message:
                                        "Import the module that defines the name - barrels are for package entry points.",
                                },
                            ],
                        },
                    ],
                },
            },
            {
                files: [TEST_PAT],
                rules: {
                    "require-await": "off",
                    "typescript/require-await": "off",
                    "typescript/no-unsafe-assignment": "off",
                },
            },
        ],
        rules: {
            "no-shadow": "off",
            "no-underscore-dangle": "off",
            "no-warning-comments": "warn",
            "unicorn/no-negated-condition": "off",
            "max-classes-per-file": "off",
            "max-lines": "off",
            "max-lines-per-function": "off",
            "typescript/no-unsafe-type-assertion": "off",
            "typescript/prefer-readonly-parameter-types": "off",
            "unicorn/custom-error-definition": ["warn"],
            "unicorn/filename-case": ["warn", { case: "snakeCase" }],
            "jsdoc/require-throws-type": "off",
            "jsdoc/require-returns": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-yields-type": "off",
        },
    },
});
