# AGENTS.local

Project rules for this DSH plugin bundle.
This file supplements [AGENTS.md](AGENTS.md); read that file first.
Adjust or extend this file for the project.
Where the two conflict, this file wins.

## Scope

This bundle collapses the left sidebar on startup and swaps the default bindings of the two sidebar toggles.
The [maintenance guide](docs/README.md) records the startup seam, preference ownership, and verification.

## Project documentation

- `README.md` is for users: installation, usage, commands, and limits.
  Provide `README.zh.md` as its Chinese version.
- [DESIGN.md](DESIGN.md) is the product design entry point.
  Read it before changing product behavior.
  It explains the user problem, intended experience, scope, and observable success criteria.
- Keep implementation contracts, proposals, and verification records separate from the product design.
  Use [docs/README.md](docs/README.md) as the index.
  Verification records say what was actually tested.
- `CHANGELOG.md` records changes by version.
  Keep progress, schedules, and debugging notes in task records.
  Before closing a task, update the product design with approved decisions and link back to it.
- Keep the plugin detail page short.
  Set `meta.title` and `meta.description` in `locale/*.json` for the DSH interface language.
  Use `meta.detail` in each locale to select a short, packaged Markdown document when needed.
  Link to the guide with an absolute HTTPS URL and put usage entry points, compatibility, and installation steps there.
  Add one localized preview when it helps explain the feature.
  Use DSH's detail page slots for interactive controls.

## Language

- For the main README, prefer English and provide a Chinese version.
- Prefer Chinese for designs and documentation.
- Keep user-facing text translatable through the project's localization mechanism,
  and maintain all eight locales (`en`, `zh`, `ja`, `de`, `es`, `fr`, `pt`, `ru`) together.
- Use English for code identifiers and keep established technical terms in English when helpful
  for precision or searchability.

## Structure

- Use TypeScript for plugin source unless otherwise specified.
  For TypeScript plugins, use the workspace TypeScript base.
  Put Host, Client, and private module sources under `src/host/`, `src/client/`, and `src/lib/` as needed.
  `npm run build:tools` compiles `scripts/*.mts` to adjacent `.mjs` files for the build and version checks.
  The build generates `client.js` and `index.js` from the TypeScript entries.
  Git ignores the generated files.
  Include the runtime files in the npm package.
- Keep Plugin Manager metadata in `locale/*.json`.
  The plugin adds no runtime text or controls.
- Node.js 22.18 or newer runs the `.test.mts` files directly.
  The client test uses a fake `ctx` to check registration, resources, and cleanup.
- `docs/scripts/reflow` is the standalone documentation formatter and requires Python 3.11 or newer.

## Reusing native DSH UI

- Prefer native DSH components, behavior, theme tokens, and layouts from comparable screens
  to reduce code and maintenance.
- Prefer runtime reuse through supported slots, component factories,
  or host-provided modules when performance is acceptable.
  Let the host supply the implementation and write only the code needed to fill gaps in existing components
  and extension points.
- When statically importing or bundling official code or assets, annotate the reference
  with the upstream package, version or commit, source path, and symbol name.
  Keep applicable licenses and attribution so future updates can be traced to the source.

## Implementation

- Keep the bundle independently installable and toggleable.
  Keep runtime modules private to this bundle and put shared tools in the workspace `tools/` directory.
- Implement the feature through supported DSH plugin APIs and extension points.
  Keep DSH source and installed files intact.
  Do not patch global behavior or override DSH internals.
  If the available extension points are insufficient, report the limitation and keep the implementation
  within the supported scope.
- Reuse the DSH type declarations for the supported runtime version.
  Preserve types across plugin interfaces, configuration, and events.
  Validate and narrow unknown inputs, and keep the type dependencies in sync.
- Keep the factory free of side effects.
  Register resources in `apply` with `ctx.effect` or `ctx.on` and return cleanup functions.
- Prefer recognizable icons for common action buttons, and use visible text only
  when an icon alone would leave the action unclear.
- Replace the placeholder icon with original artwork and update the title and description
  in all eight locale files before release.
- Resolve every scaffold placeholder before release.

## Release

- Update `CHANGELOG.md` for each release.
- Keep the npm package name scoped as `@miorin/<id>`.
- Before pushing `main`, verify a clean working tree, branch `main`, upstream tracking, and any leftover stashes.
- Publish the source repository under `miorin-chan/<id>`.
  Confirm GitHub visibility explicitly instead of inferring it from `package.json`'s `private: true`,
  set a one-sentence English About description, and add GitHub topics including `dsh-plugin`, `deepseek-harness`,
  `dsh`, plus feature-specific tags using additive edits (`gh repo edit --add-topic`) so existing topics are preserved.

## Verification

- Use `npm install` to install dependencies and build a source checkout.
  Run `npm test` to build and test, and `npm run check` to verify types and the local build artifacts.
  `npm pack --dry-run --json` checks the built package.
- From the workspace root, run `node tools/new-dsh-plugin/cli.mts --check plugins/<id>` to check the manifest,
  locale JSON, and the other scaffold files.
- Use a disposable profile for installation tests.
  Distinguish fixture results from observations in the UI.
- After a DSH upgrade, run the tests and verify the behavior in the running UI.
  Record what to verify.

## Markdown

- Run `docs/scripts/reflow md <path>` to format edited Markdown.
- Run `prek install` once per checkout to format staged Markdown at commit time.
  Keep the generated `AGENTS.md` byte-for-byte identical to the shared template.
- When committing in the DSH sandbox, use `PREK_HOME="${TMPDIR:?}/prek-dsh" git commit -m "<commit message>"`
  to run the reflow hook with a writable cache and log directory.
