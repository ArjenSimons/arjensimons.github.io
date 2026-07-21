# Clash archive

- Edit `data/players.json` to maintain the full player pool. Players have no fixed role.
- Use `admin.html` to enter a tournament. Each game selects five players and assigns a role per appearance.
- Put exported tournament JSON files in `data/tournaments/`.
- Add every tournament path to `data/index.json`, because GitHub Pages cannot list a directory.
- Serve the project through GitHub Pages or a local HTTP server; ES modules and JSON fetches will not work through `file://`.


## Rating benchmarks

Ratings use only general Emerald+ role benchmarks. Champion-specific overrides are not used. Benchmark performance maps to 6.75/10 and the score uses diminishing returns, so 8+ is strong and 9-10 is exceptional. The benchmark data lives in `data/role-benchmarks.json`; `js/benchmarks.js` is its synchronous browser mirror. The included values are calibrated estimates informed by OP.GG's public Emerald+ pages because OP.GG does not publish all required metrics as an official downloadable aggregate.
