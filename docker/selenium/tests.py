import glob
import os
import sys
import shutil
import imageio.v3 as iio
import numpy as np
import time
import json

from common import COLORS, say

TESTS = {}
SETTINGS = {
    "ip": ""
    ,"owner": ""
}

def get_tests(tests_mask):
    say(0,"tests mask:", "/chalkboard/tests/selenium/" + tests_mask)

    tests = dict([
        (name, 
        {
            "dir": testdir,
            "name": name,
            "passed": False,
            "diff": None,
            "error": None,
            "time": None,
            "settings": {"speedup": 0.2},
            "checked": False
        })
        for testdir in sorted(glob.glob("/chalkboard/tests/selenium/" + tests_mask))
        for name in [testdir.split('/')[~0]]
    ])

    for test in tests.values():
        if (os.path.isfile(f"{test['dir']}/settings.json")):
            with open(f"{test['dir']}/settings.json", "rt") as f:
                test['settings'].update(json.loads(f.read()))
        if (os.path.isfile(f"{test['dir']}/.output/.checked")):
            test['checked'] = True
            with open(f"{test['dir']}/.output/.checked", "rt") as f:
                test['passed'] = (f.read().strip()=='passed')
        TESTS[test['name']] = test

    return


def playback_test(test):
    if (not os.path.isfile(f"{test['dir']}/test.json.gzip")):
        fail_test(test, "test recording is not found")
        return 1
    else:
        shutil.copyfile(f"{test['dir']}/test.json.gzip", f"/chalkboard/records/brd_test-selenium-ui.json.gzip")
    test['time'] = time.time()
    result = os.system(f"python3.8 play.py {SETTINGS['owner']} {SETTINGS['ip']} test-selenium-ui {test['settings']['speedup']} {test['dir']}/.output {say.__level}")
    test['time'] = time.time() - test['time']

    return result


def fail_test(test, reason, diff=None):
    test["error"] = reason if test["error"] is None else test["error"]
    test["passed"] = False
    test["checked"] = True
    if diff is not None:
        test["diff"] = "[" + ", ".join(f"{d:8.5f}" for d in diff) + "]"
    else:
        test["diff"] = "?"
    say(0, "", COLORS.FAIL, "- failed: ", COLORS.WARNING, reason, COLORS.ENDC, "\t", test["diff"])
    with open(f"{test['dir']}/.output/.checked", "wt") as f:
        f.write("failed")


def pass_test(test, diff):
    test["error"] = None
    test["passed"] = True
    test["checked"] = True
    test["diff"] = "[" + ", ".join(f"{d:8.5f}" for d in diff) + "]"
    say(0, "", COLORS.OKGREEN, "- passed: ", COLORS.OKBLUE, f"({test['time']:>6.2f}s)", COLORS.ENDC, test["diff"])
    with open(f"{test['dir']}/.output/.checked", "wt") as f:
        f.write("passed")


def skip_test(test):
    test["time"] = 0
    test["diff"] = "-"
    say(0, "", COLORS.OKBLUE, "- skipped", COLORS.ENDC)


def get_image_diff(test):
    if (not os.path.isfile(f"{test['dir']}/.output/result.png")):
        fail_test(test, "test replay output image is not found")
        return None

    if (not os.path.isfile(f"{test['dir']}/result.png")):
        fail_test(test, "test reference output image is not found")
        return None

    img_out = iio.imread(f"{test['dir']}/.output/result.png")
    img_ref = iio.imread(f"{test['dir']}/result.png")
    diff = np.abs(img_out - img_ref)[:,:,0:3]

    img_diff = diff.sum(axis=2)
    max_diff = max(1, img_diff.max())
    img_diff = ((img_diff / max_diff) * 255).astype(np.uint8)
    iio.imwrite(f"{test['dir']}/.output/diff.png", np.stack([img_diff] * 3 , axis=-1))
    
    return (diff.mean(), diff.std(), (diff>0).sum() / (diff>-1).sum())

def difference_is_significant(diff):
    return (
        (diff[0] > 0.0980)or
        (diff[1] > 3.6000)or
        (diff[2] > 0.0026)
    )

def run_test(test, fast=True):
    test_dir = test['dir']
    say(0, "")
    say(0, COLORS.HEADER, f"{test['name']:<15}", test['settings'], COLORS.ENDC)

    if test['checked'] and test['passed'] and fast:
        skip_test(test)
        return

    if (os.path.exists(f"{test_dir}/.output")):
        shutil.rmtree(f"{test_dir}/.output")
    os.mkdir(f"{test_dir}/.output")

    play_result = playback_test(test)
    say(2, "play result: ", play_result)

    if str(play_result) == "2":
        raise KeyboardInterrupt

    if (play_result!=0):
        fail_test(test, f"test replay failed [{play_result}]")
        return


    image_diff = get_image_diff(test)
    if image_diff is not None:
        say(2, "image diff: ", image_diff)
        if difference_is_significant(image_diff):
            fail_test(test, "reference and replay output images are different", image_diff)
        else:
            pass_test(test, image_diff)

    os.system(f"chown -R {SETTINGS['owner']} {test_dir}/.output")


def get_report():
    failed = False
    say(0, COLORS.HEADER, ("=" * 80), COLORS.ENDC)
    say(0, COLORS.HEADER, "Tests summary:", COLORS.ENDC)
    say(0, COLORS.HEADER, ("=" * 80), COLORS.ENDC)

    total_time = 0

    for test in TESTS.values():
        test_time = test['time'] if test['time'] is not None else 0
        if test['passed']:
            say(0, f"{test['name']:<20} :", COLORS.OKGREEN, "passed", COLORS.OKBLUE, f"({test_time:>6.2f}s)", COLORS.ENDC, f"diff = {test['diff']}")
        else:
            failed = True
            say(0, f"{test['name']:<20} :", COLORS.FAIL   ,"failed",  COLORS.OKBLUE, f"({test_time:>6.2f}s)", COLORS.WARNING, f" {test['error']}", COLORS.ENDC, f"diff = {test['diff']}")
        total_time += test_time
    say(0, f" Total tests runtime: {total_time:>6.2f}s")
    return 0 if not failed else 1


def main(owner, ip, fast, verbosity, tests_mask):
    SETTINGS["ip"] = ip
    SETTINGS["owner"] = owner
    fast = int(fast)

    get_tests(tests_mask)
    print(f"Running {len(TESTS)} tests, fast = {fast}")

    for test in TESTS.values():
        run_test(test, fast=fast)
        say(1,"")
        say(1,"")

    code = get_report()
    return code


if __name__ == "__main__":
    if (len(sys.argv) != 6) or (sys.argv[1] == "?"):
        print("usage: tests.py <owner> <ip> <fast> <verbosity> <tests_mask>")
        say.__level = 0
        say(0, "args given: ", sys.argv)
        sys.exit(-1)

    say.__level = int(sys.argv[4])
    say(2, "args: ", sys.argv)

    try:
        code = main(*sys.argv[1:])
    except KeyboardInterrupt:
        code = 2
    sys.exit(code)

