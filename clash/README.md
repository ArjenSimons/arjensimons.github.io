# Clash archive

- Edit `data/players.json` to maintain the full player pool. Players have no fixed role.
- Use `admin.html` to enter a tournament. Each game selects five players and assigns a role per appearance.
- Put exported tournament JSON files in `data/tournaments/`.
- Add every tournament path to `data/index.json`, because GitHub Pages cannot list a directory.
- Serve the project through GitHub Pages or a local HTTP server; ES modules and JSON fetches will not work through `file://`.
