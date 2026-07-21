# Clash archive

- Edit `data/players.json` to maintain the full player pool. Players have no fixed role.
- Use `admin.html` to enter a tournament. Each game selects five players and assigns a role per appearance.
- Put exported tournament JSON files in `data/tournaments/`.
- Add every tournament path to `data/index.json`, because GitHub Pages cannot list a directory.
- Serve the project through GitHub Pages or a local HTTP server; ES modules and JSON fetches will not work through `file://`.


## Rating benchmarks

Ratings use only general Emerald+ role benchmarks. Champion-specific overrides are not used. Benchmark performance maps to 6.75/10 and the score uses diminishing returns, so 8+ is strong and 9-10 is exceptional. The benchmark data lives in `data/role-benchmarks.json`; `js/benchmarks.js` is its synchronous browser mirror. The included values are calibrated estimates informed by OP.GG's public Emerald+ pages because OP.GG does not publish all required metrics as an official downloadable aggregate.


## Score safeguards

- KDA is transformed with `log(1 + KDA)` before comparison, so very high KDA values have diminishing returns.
- Every favourable metric comparison is capped at 175% of its role benchmark. This also applies inversely to deaths, so an unusually low death count cannot dominate the total score.
- The role benchmark remains approximately 6.75/10.


## Role normalization and weights

Each statistic is first compared with the benchmark for the player's role. This already accounts for natural role differences such as support vision, ADC farming, and jungle kill participation. No additional role multiplier or role-specific score curve is applied. The same 0-10 conversion is used for every role. Metric weights vary only modestly by role and always sum to 1.
