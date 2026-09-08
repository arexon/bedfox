import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "version" })
export class FormatVersion {
    @Ser({
        custom: (v) => `${v[0]}.${v[1]}.${v[2]}`,
    })
    version: [number, number, number];

    constructor(major: number, minor: number, patch: number) {
        this.version = [major, minor, patch];
    }
}
