import time
import os
import sys
import traceback

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from selenium.common.exceptions import TimeoutException as SeleniumTimeoutException

from common import COLORS, say

def get_driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')

    options.add_argument('--disable-gpu')
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-infobars")

    options.add_argument("--start-maximized")
    options.add_argument('--window-size=1000,700')

    options.add_argument("--headless")
    options.add_argument("--log-level=1")
    options.add_argument('--disable-dev-shm-usage')

    service = ChromeService(
        executable_path=ChromeDriverManager(
            # driver_version="112.0.5615.49"
        ).install()
    )

    driver = webdriver.Chrome(options=options, service=service)
    # print("driver.caps", driver.capabilities)

    return driver

def wait_for_scripts(driver):
    height = None
    while (height is None):
        height = driver.execute_script("return UI;")['window_height'];
        say(0, '~', end='', flush=True)
    say(1, '+')

def take_screenshots(driver, output_dir):
    screenshots = []
    error = None
    while (True):
        try:
            ts  = driver.execute_async_script("UI._set_redraw_hook(arguments[arguments.length-1]);")
            delta = abs(ts) - screenshots[~0]["ts"] if len(screenshots)>0 else 0
            #print('received pingback:', ts, ' +', delta)
            say(0, '.', end='', flush=True)
            file_name = f"{output_dir}/grab_{len(screenshots):03g}_{delta}.png"
            driver.save_screenshot(file_name)
            screenshots.append({
                "name": file_name
                ,"delta": delta
                ,"ts" : ts
            })
        except SeleniumTimeoutException as ex:
            say(0, '?', end='')
            say(0, COLORS.WARNING, "selenium timed out while waiting for redraw_hook callback", COLORS.ENDC)
            say(2, 'Exception:', ex)
            say(2, 'Trace:', traceback.format_exc())
            error = (ex, None)
        except Exception as ex:
            error = (ex, traceback.format_exc())

        if (error is not None):
            if (error[1] is None):
                break
            say(0, '!')
            say(0, "received error:", type(error[0]), error[0])
            say(0, "trace: ", error[1])
            break

        if (ts < 0):
            say(0, '+', end='')
            say(1, "")
            say(1, "received stop signal")
            break


    return screenshots, error

def main(user, ip, uri, speedup, output_dir):
    """
    ip = '172.17.0.2'
    uri = 'test-pen-1'
    speedup = '0.2'
    output_dir = '/chalkboard/tmp'
    """
    speedup = float(speedup)

    driver = get_driver()
    url = f'http://{ip}:5000/index.html#{uri}$play?speedup={speedup}'

    say(2, f"selenium fetching URL: {url} into {output_dir}")
    driver.get(url)

    say(2, "selenium waiting for scripts")
    wait_for_scripts(driver)

    say(2, "capturing screenshots")
    screenshots, error = take_screenshots(driver, output_dir)

    if (error is not None)and(error[1] is not None):
        pass
    else:
        say(0, "[s]", end='')
        say(2, "waiting for settlement")
        time.sleep(3)

    say(0, "[c]", end='')
    say(2, "taking final screenshot")
    driver.save_screenshot(f"{output_dir}/result.png")

    say(0, "[l]", end='')
    say(2, "saving js logs")
    logs = driver.execute_script("return UI.logger.logs")
    with open(f"{output_dir}/js_log.txt", "wt") as f:
        f.write("\n".join(map(lambda l:str(l[1]) + '::' + str(l[0]), logs[::-1])))

    say(0, "[d]", end='')
    say(2, "closing selenium driver")
    driver.quit()

    say(0, "[g]", end='')
    say(2, "converting screenshots into gif")
    convert_cmd = ("convert " + " ".join([
        f"-delay {int(f['delta'] * speedup / 10)} {f['name']}" for f in screenshots
    ]) + f" -loop 0  -layers Optimize {output_dir}/result.gif")
    os.system(convert_cmd)

    say(0, "[x]", end='')
    say(2, "cleaning up screenshots")
    for f in screenshots:
        say(2, '.', end='', flush=True)
        os.remove(f["name"])
    say(2, '')

    say(0, "[o]", end='')
    say(2, "switching ownership")
    os.system(f"chown -R {user} {output_dir}/*")

    return ((error is not None)and(error[1] is not None))*1


if __name__ == "__main__":
    if (len(sys.argv) != 7) or (sys.argv[1] == "?"):
        print("usage: play.py <owner> <ip> <uri> <speedup> <output_dir> <verbosity>")
        sys.exit(-1)

    say.__level = int(sys.argv[6])
    say(2, "args: ", sys.argv)

    try:
        code = main(*sys.argv[1:-1])
    except KeyboardInterrupt:
        code = -2

    sys.exit(code)
