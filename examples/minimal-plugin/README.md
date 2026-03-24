# Minimal Plugin Example

This example demonstrates how to create a simple plugin for neobbs.

It shows how to:
- register permissions
- register services
- register routes
- use the plugin inside an application

## Run

```bash
node index.js
```

## Expected Output

```
────────────────────────────────────────
 Minimal Plugin
────────────────────────────────────────

Hello from the example service.

────────────────────────────────────────
>>
```

Press `Ctrl+C` to exit.

## Why This Example Matters

This example is intended to be copied and modified.

Developers should use this as the starting point for creating their own plugins.

A plugin is a plain function that receives the engine and registers:
- **permissions** — what actions are allowed
- **services** — business logic, shared across routes
- **routes** — named screens that handle user navigation

Once registered via `engine.use(plugin)`, a plugin's routes, services, and permissions become part of the running application.
