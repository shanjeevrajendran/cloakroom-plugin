# Cloakroom plugin (install files)

This repo only hosts the Claude Code install files. Cloakroom itself (docs, benchmarks, issues, and stars ⭐) lives at https://github.com/shanjeevrajendran/cloakroom

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

## The panel

Claude Code shows a small Cloakroom panel beside the chat; `/cloakroom-panel` opens it again if you close it. It only reads Cloakroom's activity log on your computer (counts, never the values), and sends nothing anywhere.

- **The light** says whether Cloakroom is on (green), paused (amber) or not set up yet (grey).
- **Masked**: how many private values were swapped out before Claude saw them in this session.
- **Stopped**: prompts or commands Cloakroom blocked.
- **Held**: commands waiting for your OK.
- **Not checked**: calls that went through without a full check (for example a file too large to scan).
- **Pause prompt checks 10 min** stops checking the prompts you type, the same as typing `cr: pause 10m`. Files and tool results stay protected.
- **Resume checks** turns prompt checks back on, the same as typing `cr: resume`.

## Privacy

Everything runs on your machine. Cloakroom reads your prompts, the output of Claude's tool calls and the files
Claude writes, so it can mask and restore values. It sends none of it anywhere; the details are below. To remove
everything: `/plugin uninstall cloakroom`, uninstall the program (`uv tool uninstall cloakroom` or
`pipx uninstall cloakroom`), delete `~/.cloakroom`, and delete the `cloakroom` / `vault-key` entry from your
system's secure store. How masking works and what it does not protect against:
[How it works](https://github.com/shanjeevrajendran/cloakroom/blob/main/docs-HOW-IT-WORKS.md#threat-model).
Security reports: [SECURITY.md](https://github.com/shanjeevrajendran/cloakroom/blob/main/SECURITY.md).

### What it fetches and sends

- **Fetches once:** the `cloakroom` package and its dependencies from PyPI, and the PII-Tracer detection model
  (`perplexity-ai/PII-Tracer`, a pinned revision) from Hugging Face. Without uv or pipx, it first fetches
  uv 0.13.1 with its maker's installer from astral.sh (`https://astral.sh/uv/0.13.1/install.sh`, or `install.ps1`
  on Windows), and runs that script only if its SHA-256 matches the one pinned in the plugin
  (`7c482d409673a53f4d9bd34ae95c9166be3b8d89ca82f27dd7bca3cab457afff` for install.sh,
  `f6c934a9926096f957615f9f5276efd3caeab58253eec613963a72d12b380e63` for install.ps1, the digests GitHub lists for
  that uv release); the script downloads uv from releases.astral.sh and checks it against its own SHA-256. uv then
  downloads a standalone Python 3.12 from releases.astral.sh when the machine has none. On machines without a GPU
  it builds a faster
  CPU copy of the model locally. The OCR models for scanned PDFs and photos ship inside the package, so OCR
  downloads nothing and runs on your CPU.
- **Sends nothing.** File contents, prompts and tool output never leave your machine through Cloakroom. The only
  network calls are the downloads above.

### What it stores

- An AES-GCM encrypted vault of the real values for each session in `~/.cloakroom`, with the key in your system's
  secure store (Keychain, Windows Credential Manager, Secret Service).
- An activity log without values, and your labels and rules (encrypted) for the local dashboard
  (`cloakroom dashboard`).

License: Apache-2.0. Made by Shanjeev Rajendran.
