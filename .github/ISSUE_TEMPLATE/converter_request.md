---
name: Converter request
about: Add or remove a format, when people really need it
title: '[CONVERTER] '
labels: ['converter', 'needs-triage']
assignees: []
---

<!--
JSONPrism is in maintenance mode (CONTRIBUTING.md → Maintenance mode): it
takes no new features, but a format can still be added or removed when
there is a real need. Other ideas go to Discussions → Ideas:
https://github.com/poli0981/jsonPrism/discussions/categories/ideas
-->

## Add or remove?

- [ ] Add a format
- [ ] Remove a format

## Format

Name, file extension(s), and a link to its specification.

## Who needs it, and for what?

The real workflow this serves, or, for a removal, why the format should go.
Requests without a concrete use case are closed.

## Direction

- [ ] JSON → format
- [ ] Format → JSON
- [ ] Input only (like JSONC → JSON)

## Sample

A small input and the output you expect:

```json
{ "example": "input" }
```

```
expected output here
```

## Scope check

- [ ] It fits the "one JSON → many formats" mission
- [ ] It can run entirely on the user's device (no server)
- [ ] No format JSONPrism already has covers it
- [ ] I checked the latest build at https://jsonprism.poli0981.dev
