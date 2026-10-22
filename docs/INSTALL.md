# Install Cloakroom

Full docs, issues and stars ⭐: https://github.com/shanjeevrajendran/cloakroom

## Get started

You need Claude Code, installed and signed in. Then:

1. **Open a terminal.** Mac: press Cmd+Space, type "Terminal", press Enter. Windows: open Start, type
   "PowerShell", press Enter. Linux: press Ctrl+Alt+T. Type `claude` and press Enter.
2. **Add Cloakroom.** Inside Claude Code, type these two lines, one at a time. If it asks where to install, pick the
   option for all your projects (user scope).

   ```
   /plugin marketplace add shanjeevrajendran/cloakroom
   /plugin install cloakroom@cloakroom
   ```

3. **Restart Claude Code.** Type `/exit`, then `claude` again. Cloakroom now installs itself. Keys and card numbers
   are covered in about a minute; names and addresses a few minutes later, once the detection model has downloaded
   (about 1 GB on a Mac, up to about 4 GB elsewhere). Claude's tool calls are held back until then.
4. **Check it.** Open a new terminal window and run `cloakroom doctor` (every line should say ok), then
   `cloakroom dashboard` to see your alerts in the browser.

What you need first: nothing. When neither uv nor pipx is there, Cloakroom fetches uv itself (with `curl` or
`wget` on Mac and Linux), and uv brings its own Python 3.12. If something needs you (no `curl` or `wget` on a Linux
machine, no internet), Cloakroom's message and `~/.cloakroom/bootstrap.log` give numbered steps, for example
`sudo apt install curl` (Ubuntu/Debian) or `sudo dnf install curl` (Fedora/RHEL), then restart Claude Code.

If `cloakroom` isn't found, open a new terminal: the program lives in `~/.local/bin` (on Windows,
`%USERPROFILE%\.local\bin`), and the installer puts that folder on the PATH of new terminals (shell profile on Mac
and Linux, user PATH on Windows). Setup progress is written to `~/.cloakroom/bootstrap.log`.

Known limits: on an Intel Mac Cloakroom runs with rules-only protection (keys, cards, IDs; not names and addresses),
because PyTorch and ONNX Runtime publish no Intel Mac builds. Linux on ARM (aarch64) gets full protection. On Linux
without a desktop keyring (Secret Service), for example a server, the vault key is kept in a file only you can read,
and `cloakroom doctor` says so.

License: Apache-2.0. Made by Shanjeev Rajendran.
