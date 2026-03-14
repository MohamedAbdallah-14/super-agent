# Third-Party License Inventory

This file records third-party components currently used by the active SuperAgent product surface.

## Runtime dependencies

| Package | Version | License | Homepage |
| --- | --- | --- | --- |
| `ajv` | `8.18.0` | `MIT` | <https://ajv.js.org> |
| `yaml` | `2.8.2` | `ISC` | <https://eemeli.org/yaml/> |
| `gray-matter` | `4.0.3` | `MIT` | <https://github.com/jonschlinkert/gray-matter> |

## Indexing note

The current built-in indexer uses in-repo heuristic extractors and the built-in `node:sqlite` module.

There are currently no bundled external parser grammar packages in the active SuperAgent surface.

If and when parser grammar packages are added, they must be recorded here with:

- exact package name
- version
- license
- upstream homepage or repository
- keep/remove rationale if licensing or maintenance changes
