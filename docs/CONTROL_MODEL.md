# Control Model

Maker is built around a structured control architecture.

This document explains how control is enforced technically.

---

## 1. Permission Engine

Every executable action passes through a 3-state policy layer:

- AUTO_ALLOWED
- APPROVAL_REQUIRED
- DENIED

No LLM call, file access, or network action bypasses this layer.

Permission scope:
- Per Bot
- Global
- One-time approval

---

## 2. LLM Egress Control

Outgoing data to LLM providers is explicitly governed:

- Metadata Only
- Full Content
- Denied

The system never silently transmits user data.

---

## 3. Structured Pipeline Architecture

Execution flow is deterministic:

Collect → Analyze → Structure → Approve → Schedule

Each stage is:

- Logged
- Observable
- Interruptible
- Timeout protected

---

## 4. Memory Model

Long-term memory is explicit, not implicit.

- Stored in rule_memories table
- Scoped per user
- Governed by MEMORY_WRITE permission
- Editable, removable, inspectable

AI does not "secretly remember."
Memory is structured and controllable.

---

## 5. Local OS Integration (Desktop Mode)

In desktop mode:

- SQLite local storage
- File access behind permission wall
- Calendar access permission-bound
- Optional external connectors

Local privileges are never enabled by default.

---

## 6. Observability

Maker tracks:

- Execution status
- Timeout events
- Failure diagnostics
- Permission approvals
- Audit logs

AI execution is transparent infrastructure.

---

## Design Goal

We are not building autonomous agents.

We are building:

A permission-governed AI execution layer.

Control is not a feature.

It is the foundation.
