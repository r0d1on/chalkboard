# Creating Selenium visual tests

Selenium tests replay recorded UI events, capture the final board as an image,
and compare that image with a checked-in reference. Test fixtures live under
`tests/selenium/`.

## Record a UI session

1. From the repository root, start the backend:

   ```bash
   make start_backend
   ```

2. Open a recording-mode board in Chrome. Use a unique board name for the
   recording:

   ```text
   http://127.0.0.1:5000/index.html#record-shape$record
   ```

3. Press **`** (backtick) to start recording, perform the actions to test, and
   press **`** again to stop recording.
4. Press **F2** to save the recording. It is written to
   `records/brd_<board-name>.json.gzip`, so the example board saves as
   `records/brd_record-shape.json.gzip`.

Use F2 for this workflow: the recorder's “download recording” action exports
only the event array, while Selenium fixtures require a gzip-compressed JSON
object with a `name` and a `log` array. The F2 backend save uses that expected
format.

## Create and run the test

Create a new test directory and copy the recording into it:

```bash
mkdir -p tests/selenium/shape-0
cp records/brd_record-shape.json.gzip tests/selenium/shape-0/test.json.gzip
printf '{"speedup":1.0}\n' > tests/selenium/shape-0/settings.json
```

`settings.json` is optional; the default playback speedup is `0.2`. A larger
value replays events faster. Start with `1.0` and adjust it if the recording
needs more or less playback time.

Run the new test to generate its first replay screenshot:

```bash
make runtest test=shape-0
```

The first run will fail the image comparison because `result.png` does not yet
exist. Review the generated image at
`tests/selenium/shape-0/.output/result.png`, then copy it into place as the
reference:

```bash
cp tests/selenium/shape-0/.output/result.png tests/selenium/shape-0/result.png
```

Run the test again to compare the replay against the reference:

```bash
make runtest test=shape-0
```

The replay output and image difference are saved under `.output/`; these are
generated artifacts, not test fixtures. The committed `result.png` is the
reference image. The runner uses headless Chrome at 1000x787 and allows small
image differences. If a comparison fails, inspect `.output/diff.png` and
`.output/result.png` before updating the reference.

Use `make runtest test=<test-name>` while developing; unlike `make quicktest`,
it does not skip tests based on a previous passing status. `make test` runs the
full Selenium suite.
