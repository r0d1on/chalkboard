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

def get_tests():
    tests = dict([
        (name, 
        {
            "dir": testdir
            ,"name": name
            ,"passed": False
            ,"diff": None
            ,"error": None
            ,"time": None
            ,"settings": {"speedup": 0.2}
            ,"checked": False
        })
        for testdir in sorted(glob.glob("/chalkboard/tests/selenium/*"))
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
        fail_test(test, "test recording is not found", "?")
        return 1
    else:
        shutil.copyfile(f"{test['dir']}/test.json.gzip", f"/chalkboard/records/brd_test-selenium-ui.json.gzip")
    test['time'] = time.time()
    result = os.system(f"python3.8 play.py {SETTINGS['owner']} {SETTINGS['ip']} test-selenium-ui {test['settings']['speedup']} {test['dir']}/.output {say.__level}")
    test['time'] = time.time() - test['time']

    return result


def fail_test(test, reason, diff):
    test["error"] = reason
    test["passed"] = False
    test["checked"] = True
    test["diff"] = diff
    say(0, "")
    say(0, f"{test['name']:<15}", COLORS.FAIL, "- failed: ", COLORS.WARNING, reason, COLORS.ENDC)
    with open(f"{test['dir']}/.output/.checked", "wt") as f:
        f.write("failed")


def pass_test(test):
    test["error"] = None
    test["passed"] = True
    test["checked"] = True
    test["diff"] = "0"
    say(0, "")
    say(0, f"{test['name']:<15}", COLORS.OKGREEN, "- passed: ", COLORS.OKBLUE, f"({test['time']:>6.2f}s)", COLORS.ENDC)
    with open(f"{test['dir']}/.output/.checked", "wt") as f:
        f.write("passed")


def skip_test(test):
    test["time"] = 0
    test["diff"] = "-"
    say(0, f"{test['name']:<15}", COLORS.OKBLUE, "- skipped", COLORS.ENDC)


def get_image_diff(test):
    if (not os.path.isfile(f"{test['dir']}/.output/result.png")):
        fail_test(test, "test replay output image is not found", "?")
        return None

    if (not os.path.isfile(f"{test['dir']}/result.png")):
        fail_test(test, "test reference output image is not found", "?")
        return None

    img_out = iio.imread(f"{test['dir']}/.output/result.png")
    img_ref = iio.imread(f"{test['dir']}/result.png")
    return np.abs(img_out - img_ref)[:,:,0:3].mean()


def run_test(test, fast=True):
    test_dir = test['dir']
    say(1, COLORS.HEADER, ("=" * 80), COLORS.ENDC)
    say(0, COLORS.HEADER, f"{test['name']:<15}", test['settings'], COLORS.ENDC)
    say(1, COLORS.HEADER, ("=" * 80), COLORS.ENDC)

    if test['checked'] and test['passed'] and fast:
        skip_test(test)
        return

    if (os.path.exists(f"{test_dir}/.output")):
        shutil.rmtree(f"{test_dir}/.output")
    os.mkdir(f"{test_dir}/.output")

    play_result = playback_test(test)
    say(2, "play result: ", play_result)

    if (play_result!=0):
        fail_test(test, "test replay failed", "?")
        return

    image_diff = get_image_diff(test)
    if image_diff is None:
        return

    say(2, "image diff: ", image_diff)
    if (image_diff > 0):
        fail_test(test, "reference and replay output images are different", image_diff)
        return

    pass_test(test)


def get_report():
    failed = False
    say(0, COLORS.HEADER, ("=" * 80), COLORS.ENDC)
    say(0, COLORS.HEADER, "Tests summary:", COLORS.ENDC)
    say(0, COLORS.HEADER, ("=" * 80), COLORS.ENDC)

    for test in TESTS.values():
        if test['passed']:
            say(0, f"{test['name']:<20} :", COLORS.OKGREEN, "passed", COLORS.OKBLUE, f"({test['time']:>6.2f}s)", COLORS.ENDC)
        else:
            failed = True
            say(0, f"{test['name']:<20} :", COLORS.FAIL   ,"failed",  COLORS.OKBLUE, f"({test['time']:>6.2f}s)", COLORS.WARNING, f"diff = {test['diff']:>6} :: {test['error']}", COLORS.ENDC)
    return 0 if not failed else 1


def main(owner, ip, fast):
    SETTINGS["ip"] = ip
    SETTINGS["owner"] = owner
    fast = int(fast)

    get_tests()
    print(f"Running {len(TESTS)} tests, fast = {fast}")

    for test in TESTS.values():
        run_test(test, fast=fast)
        say(1,"")
        say(1,"")

    code = get_report()
    return code


if __name__ == "__main__":
    if (len(sys.argv) != 5) or (sys.argv[1] == "?"):
        print("usage: tests.py <owner> <ip> <fast> <verbosity>")
        sys.exit(-1)

    say.__level = int(sys.argv[4])
    say(2, "args: ", sys.argv)

    code = main(*sys.argv[1:-1])
    sys.exit(code)

