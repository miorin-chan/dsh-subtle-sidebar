# Subtle sidebar

[简体中文](README.zh.md)

Starts DeepSeek Harness with the left sidebar collapsed.
The native toggle still opens it, and changing sessions leaves it alone.

When both sidebar commands still use their defaults, the plugin swaps the two bindings
in the current device's shortcut preferences.
It leaves custom bindings and unbound platforms alone.
The settings remain editable, and a completed swap survives plugin removal.
To undo it, disable the plugin, clear the left sidebar binding in **Keyboard shortcuts**,
then restore the right and left sidebar bindings to their defaults, in that order.

Requires DeepSeek Harness 0.2.2-rc.5 or newer. Enable **Subtle sidebar** in Visual Atlas.
To install it separately, build the checkout with `pnpm install` and select the directory in **Plugins → Add plugin**.
Use only one of these installation methods per profile.

[Project documentation](docs/README.md)
