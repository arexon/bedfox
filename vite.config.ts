import { defineConfig } from "vite-plus";

export default defineConfig({
    test: {
        include: ["packages/*/tests/**/*.test.ts"],
        snapshotSerializers: ["./packages/api/tests/_json_serializer.ts"],
    },
    pack: {
        dts: true,
        entry: ["src/*/index.ts", "src/*.ts"],
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
                                    group: ["#/core/index", "#/feature/index"],
                                    message:
                                        "Import the module that defines the name - barrels are for package entry points.",
                                },
                            ],
                        },
                    ],
                },
            },
        ],
        rules: {
            "no-shadow": "off",
            "no-underscore-dangle": "off",
            "typescript/no-unsafe-type-assertion": "off",
            "unicorn/custom-error-definition": ["warn"],
            "unicorn/filename-case": ["warn", { case: "snakeCase" }],
        },
    },
});
