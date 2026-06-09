# Image Format Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add original, PNG, JPEG, and WebP download options for every discovered website icon.

**Architecture:** The existing proxy endpoint accepts a requested output format and uses `sharp` only when conversion is requested. Frontend selectors update download links without changing preview behavior.

**Tech Stack:** Node.js, sharp, Node test runner, browser JavaScript

---

### Task 1: Conversion Service

- [ ] Add failing tests for original passthrough, PNG/JPEG/WebP conversion, and invalid formats.
- [ ] Add `sharp` and implement a focused conversion helper.
- [ ] Run focused and full tests.

### Task 2: Download API

- [ ] Pass the requested format through `/api/icon-file`.
- [ ] Return matching content type, bytes, and filename extension.
- [ ] Run focused and full tests.

### Task 3: Frontend Controls

- [ ] Add format selectors to recommended and candidate templates.
- [ ] Update download links when a selector changes.
- [ ] Add responsive selector styling.

### Task 4: Verification

- [ ] Run tests and syntax checks.
- [ ] Verify original, PNG, JPEG, and WebP downloads in the browser.
- [ ] Verify mobile layout and invalid format errors.
