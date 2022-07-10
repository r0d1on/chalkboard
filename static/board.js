"use strict";

import {copy, _new} from './base/objects.js';

import {Menu} from './ui/Menu.js';

import {UI} from './ui/UI.js';

import {BOARD} from './ui/BOARD.js';

import {GRID_MODE} from './ui/GRID_MODE.js';

import {BRUSH} from './ui/BRUSH.js';

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

// background tools
import {PanZoomTool} from './tools/PanZoomTool.js';
import {UndoTool} from './tools/UndoTool.js';

// menu actions
import {SAVE} from './actions/SAVE.js';
import {SLIDER} from './actions/SLIDER.js';


var DT=[];
function debug(t) {
    if (BOARD.board_name=='debug') {
        console.log(t);
        DT.splice(0,0,t);
        DT.slice(0,40);

        var ctx = UI.contexts[UI.LAYERS.indexOf("overlay")];

        for(var i=0; i < DT.length; i++) {
            ctx.fillStyle = "white";
            ctx.fillRect(10, i*25, 20*DT[i].length, 20);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.font="20px courier";
            ctx.strokeText(""+(i)+"::"+DT[i], 10, 20+i*25);
        };
    };
};


// SETUP CONTAINER
let SETUP = {
     icon : [null,[23,53],[20,54],[16,54],null,[7,44],[7,40],[8,37],[10,34],[13,32],[17,32],[20,32],[23,33],[26,35],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],null,[10,44],[11,41],[14,38],[18,38],[21,40],[23,43],[22,47],[20,49],null,[7,44],[8,46],null,[16,54],[20,49],null,[10,44],[8,46],null,[18,52],[20,49],[24,49],[26,44],[25,40],[22,36],[18,35],[14,36],[11,38],[10,44],null,[8,46],[7,44],[7,40],[8,37],[10,34],null,[13,32],[17,32],[20,32],[26,35],null,[23,33],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],[20,54],[16,54],[20,49],[22,50],[24,49],[26,44],[25,40],[22,36],null,[18,35],[14,36],[11,38],[9,43],null,[25,40],[26,35],[25,40],null,[37,8],[40,7],[43,7],null,[54,15],[54,19],[53,22],[51,25],[49,27],[45,29],[42,29],[39,28],[36,26],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],null,[50,15],[50,19],[47,21],[44,23],[40,21],[38,18],[38,14],[40,11],null,[54,15],[52,14],null,[43,7],[40,11],null,[50,15],[52,14],null,[42,9],[40,11],[36,13],[35,17],[36,21],[39,25],[44,26],[48,24],[50,21],[50,15],null,[52,14],[54,15],[54,19],[53,22],[51,25],null,[49,27],[45,29],[42,29],[36,26],null,[39,28],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],[40,7],[43,7],[40,11],[38,11],[36,13],[35,17],[36,21],[39,25],null,[44,26],[48,24],[50,21],[52,17],null,[36,21],[36,26],[36,21],null,[26,35],[36,26],null,[23,33],[33,23],null,[28,38],[39,28],[26,35],null,[28,38],[39,28],null,[26,35],[36,26],[23,33],[33,23],[23,33],[36,26]]

    ,canvas : null
    
    ,init : function() {
        SETUP.canvas = MENU_main.add("root", "setup", null, "canvas")[1];
        var ctx = SETUP.canvas.getContext("2d");
        UI.draw_glyph(SETUP.icon, ctx);
    }

    ,add_item : function(item, title) {
        var canvas = MENU_main.add("setup", item.name, item.click, "canvas", title)[1];
        item.init(canvas);
    }
    
}


var MENU_main = null;
var MENU_options = null;

// initialising piece
function init() {
    UI.init();

    MENU_main = _new(Menu, ["root", "menu", true]);
    MENU_options = _new(Menu, ["root", "options", false]);
    
    // brush color/size menu item
    BRUSH.init(MENU_main, MENU_options);
    BRUSH.select_color(0);
    
    // drawing tools menu item
    TOOLS.init(MENU_main, MENU_options);
    // background tools
    TOOLS.add_tool(_new(PanZoomTool, []), false); // "Control" pan & zoom tool handler
    let undo = _new(UndoTool, []);
    TOOLS.add_tool(undo, false); // "Backspace" undo handler 
    TOOLS.add_tool(SelectorTool.DELETE, false); // "Delete" deleter handler
    // foreground tools
    TOOLS.add_tool(_new(PenTool, []), true, "[p]en");
    TOOLS.add_tool(_new(EraserTool, []), true, "[e]raser");
    TOOLS.add_tool(_new(TexterTool, [MENU_main]), true, "text [i]nput");
    TOOLS.add_tool(_new(BoxTool, []), true, "[b]ox");
    TOOLS.add_tool(_new(CircleTool, []), true, "[c]ircle/ellipse");
    TOOLS.add_tool(_new(LineTool, []), true, "[l]ine, arrow");
    let selector = _new(SelectorTool, []);
    TOOLS.add_tool(selector, true, "[s]elect - scale, rotate, copy, paste");
    TOOLS.activate("pen");
    
    // config menu item
    SETUP.init(MENU_main);
    SETUP.add_item(BRUSH.MODE, "brush scale on/off");
    SETUP.add_item(GRID_MODE, "grid on/off");

    // undo menu item
    var ctx = MENU_main.add("root", "undo", undo.on_activated, "canvas", "undo [backspace]")[1].getContext('2d');
    UI.draw_glyph(undo.icon, ctx);
    
    // delete menu item (selector.DELETE + default paste)
    selector.init(MENU_main);
    
    // save menu item
    SAVE.init(MENU_main);
    
    // separator
    // MENU_main.add("root", null);
    
    // slides controls
    SLIDER.init(MENU_main);
    
    UI.redraw();
    
    console.log("board.js initialised");
};

console.log("loaded board.js");

document.addEventListener("DOMContentLoaded", function(event){
    setTimeout(init, 100);
});

