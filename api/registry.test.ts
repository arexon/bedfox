// import { Block, GeometryBlockComponent } from "@bedfox/api/block";
// import { Registry } from "@bedfox/api/registry";
// import { assertEquals } from "@std/assert/equals";

// Deno.test(Registry.name, () => {
//     const reg = new Registry("test");
//     reg.add(
//         new Block("with_geo")
//             .setComponent(new GeometryBlockComponent("geometry.foo")),
//         new Block("foo"),
//         new Block("bar"),
//     );

//     for (const blk of reg.query(Block).with(GeometryBlockComponent)) {
//         assertEquals(blk.identifier, "with_geo");

//         // do anything atp, like maybe adding a state
//         blk.setState("meow", false, true);
//     }
// });
