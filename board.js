'use strict';

import {Menu} from './ui/Menu.js';

import {UI} from './ui/UI.js';

import {BOARD} from './ui/BOARD.js';
import {BRUSH} from './ui/BRUSH.js';

import {Toast} from './util/Toast.js';

// drawing tools handler: menu, events
import {TOOLS} from './ui/TOOLS.js';

// drawing tools
import {PenTool} from './tools/PenTool.js';
import {EraserTool} from './tools/EraserTool.js';
import {SelectorTool} from './tools/SelectorTool.js';
import {TexterTool} from './tools/TexterTool.js';
import {LineTool} from './tools/LineTool.js';
import {BoxTool} from './tools/BoxTool.js';
import {CircleTool} from './tools/CircleTool.js';
import {FillTool} from './tools/FillTool.js';

// background tools
import {PanZoomTool} from './tools/PanZoomTool.js';
import {UndoTool} from './tools/UndoTool.js';
import {RedoTool} from './tools/RedoTool.js';

// menu actions
import {Settings} from './actions/Settings.js';
import {SAVE} from './actions/SAVE.js';
import {SLIDER} from './actions/SLIDER.js';

// about menu item handler
import {ABOUT} from './about/ABOUT.js';

const io_module = import('./ui/IO' + get_io_type() + '.js');

let MENU_main = null;
let MENU_options = null;

function get_io_type() {
    let [board_name, view_mode, params] = UI._hash_board_mode(); // eslint-disable-line no-unused-vars
    if ((view_mode=='record')||(view_mode=='play')) {
        return '.recorder';
    } else {
        return '';
    }
}

// init everything
function init(IO) {
    UI.init(IO);

    MENU_main = Menu.new('menu', true);
    MENU_options = Menu.new('options', false);

    UI.addEventListener('on_resize', ()=>{
        MENU_main.on_resize();
    });

    // brush color/size menu item
    BRUSH.init(MENU_main, MENU_options);
    BRUSH.select_color(0);

    // drawing tools menu item
    TOOLS.init(MENU_main, MENU_options);

    // background tools
    TOOLS.add_tool(PanZoomTool.new(), false); // "Control" pan & zoom tool handler

    let undo = UndoTool.new();
    TOOLS.add_tool(undo, false); // "Backspace" undo handler

    let redo = RedoTool.new();
    TOOLS.add_tool(redo, false); // Shift+"Backspace" redo handler

    TOOLS.add_tool(SelectorTool.DELETE, false); // "Delete" deleter handler

    // foreground tools
    TOOLS.add_tool(PenTool.new(), true, '[p]en');
    TOOLS.add_tool(EraserTool.new(), true, '[e]raser');
    TOOLS.add_tool(TexterTool.new(MENU_main), true, 'text [i]nput');
    TOOLS.add_tool(BoxTool.new(), true, '[b]ox');
    TOOLS.add_tool(CircleTool.new(), true, '[c]ircle/ellipse');
    TOOLS.add_tool(LineTool.new(), true, '[l]ine, arrow');
    let selector = SelectorTool.new();
    TOOLS.add_tool(selector, true, '[s]elect - scale, rotate, copy, paste');
    TOOLS.add_tool(FillTool.new(), true, '[f]ill');
    TOOLS.activate('pen', false, 0);

    // config menu item
    Settings.init(MENU_main);
    Settings.add_item(BRUSH.SCALED, 'brush scale on/off');
    Settings.add_item(BRUSH.OPACITY, 'brush default opacity');
    Settings.add_item(BRUSH.PRESSURE, 'pressure mode - opacity / width');
    Settings.add_item(BRUSH.PALETTE, 'brush palette preset');
    Settings.add_item(UI.GRID_MODE, 'grid on/off');
    Settings.add_item(UI.THEME, 'board theme: whiteboard / blackboard / greenboard');

    // undo menu item
    MENU_main.add_icon('root', 'undo', undo.icon, 'undo [backspace]', undo.on_activated);

    // redo menu item
    MENU_main.add_icon('root', 'redo', redo.icon, 'redo [shift+backspace]', redo.on_activated);

    // delete menu item (selector.DELETE + default paste)
    selector.init(MENU_main);

    // save menu item
    SAVE.init(MENU_main);

    // slides controls
    SLIDER.init(MENU_main);

    // about menu
    ABOUT.init(MENU_main);

    // IO-owned menu items
    IO.init(MENU_main);

    BRUSH.post_init();


    UI.redraw();

    if (BOARD.board_name=='') {
        window.location.hash = 'board-' + UI.view_id;
    } else {
        document.title = BOARD.board_name;
    }

    UI._sel_loglevel();

    UI.MENU_main = MENU_main;
    UI.MENU_options = MENU_options;

    UI.log(0, 'board.js initialised', BOARD.board_name);
}

console.log('loaded board.js');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready');

    setTimeout(()=>{
        console.log('init()');
        UI.set_busy('UI', true);

        io_module.then((module)=>{
            let IO = module.IO.new();
            console.log('IO type: ', IO.type);
            init(IO);

            window.bp = ()=>{debugger;}; // eslint-disable-line no-debugger
            window.UI = UI;
            window.BOARD = BOARD;
            window.timeit = (...args)=>{UI.IO.timeit(...args);};

            if (UI.view_mode=='play') {
                if (BOARD.board_name.startsWith('test'))
                    Toast.ignore_topic('recorder');

                UI.addEventListener('on_stale', ()=>{
                    IO.load_recording().then(()=>{
                        IO.start_playing((UI.view_params['speedup']||1.0)*1);
                    });
                    UI.dropEventListener(); // ensure it's called only once
                });
            } else {
                UI.on_resize();
            }

            UI.set_busy('UI', false);

            UI.env_info();
        }).catch((error)=>{
            console.log('Error while loading IO module', error);
        });

    }, 100);

    window.UI = UI;
});

