# Contributing to Maker

Thank you for considering contributing to Maker.

Maker is a control-centered AI automation engine.
Our goal is not to build autonomous AI, but to build AI systems
that remain transparent, inspectable, and governed by the user.

If that direction resonates with you, we welcome your contribution.

---

## 📌 Project Direction

Before contributing, please read:

- docs/PHILOSOPHY.md
- docs/CONTROL_MODEL.md (if available)

Maker is built around three core ideas:

1. AI must operate within explicit permissions.
2. Every execution must be observable.
3. Users must remain in control of automation.

All contributions should align with these principles.

---

## 🧠 Areas of Contribution

We welcome contributions in the following areas:

### Core Engine
- Pipeline execution logic
- Multi-LLM routing improvements
- Scheduling and job orchestration
- Memory system enhancements

### Permission & Policy System
- Permission enforcement improvements
- Data egress governance
- Audit logging expansion
- Security hardening

### Desktop (Electron)
- Local OS integrations
- File system permission UX
- Performance optimizations
- Packaging & distribution improvements

### Web Platform
- Multi-user isolation
- Permission dashboard enhancements
- UX clarity for governance features

### Documentation
- Architecture explanations
- Diagrams
- Developer onboarding guides
- Translation improvements

---

## 🚫 Non-Goals

Maker is not intended to be:

- An autonomous agent framework
- A prompt playground
- A viral AI wrapper
- A growth-first SaaS experiment

Contributions that weaken user control,
hide automation behavior,
or bypass permission enforcement
will likely not be accepted.

---

## 🛠 Development Setup

Clone and install:

```bash
git clone https://github.com/Salepark/maker.git
cd maker
npm install
```

Run in desktop development mode:

```bash
npm run dev:desktop
```

See `LOCAL_SETUP.md` for detailed instructions.

---

## 🧩 Contribution Guidelines

When adding or modifying features:

1. Clearly define permission impact.
2. Ensure execution is observable.
3. Avoid hidden or silent automation.
4. Consider data egress implications.
5. Keep logic deterministic where possible.

Every new execution path should answer:

- Who allowed this?
- What data is being used?
- Is this logged?
- Can the user revoke it?

---

## 🔀 Pull Request Process

1. Fork the repository.
2. Create a feature branch.
3. Keep changes focused and minimal.
4. Include a clear description:
   - What problem does this solve?
   - How does it impact permissions?
   - Are audit logs affected?
5. Link related issues if applicable.

PRs may be reviewed for architectural alignment,
not just code correctness.

---

## 🧭 Roadmap Awareness

Maker is currently focused on:

- Strengthening the permission architecture
- Improving long-term memory governance
- Expanding local-first capabilities
- Hardening deterministic AI execution

If your contribution aligns with these goals,
it will likely receive priority review.

---

## 💬 Community Conduct

Be respectful.
Be clear.
Assume good intent.
Debate ideas, not people.

---

## Final Note

Maker is building an AI execution layer
where humans remain in control.

If you believe AI should be governed rather than unleashed,
we would be glad to build this with you.
