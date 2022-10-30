'use strict';

import {copy} from '../base/objects.js';

import {BRUSH} from './BRUSH.js';
import {UI} from './UI.js';


// TOOLS CONTAINER
let TOOLS = {
    canvas : null
    ,div : null

    ,tools : {}

    ,previous : []

    ,current : null
    ,background : null
    ,alt_tools : {} // tools assigned to alt mouse buttons

    ,MENU_main : null
    ,MENU_options : null


    ,option_update_icon : function(tool, option_name) {
        let option = tool.options[option_name];
        let option_value = tool[option_name];
        let icon_color = (option_value==0)?'#555':undefined;
        let icon_idx = (option.type=='binary')?0:option_value;
        let icon = option.icon[icon_idx]||tool.icon;
        option.ctx.canvas.width = option.ctx.canvas.width+1-1;
        UI.draw_glyph(icon, option.ctx, undefined, icon_color);
    }

    ,option_get_click_handler : function(tool, option_name) {
        return ()=>{
            let option = tool.options[option_name];
            let option_value = tool[option_name] + 1;
            option_value = option_value % ((option.type=='binary')? 2 : option.icon.length);
            tool[option_name] = option_value;

            (option.on_click)&&(option.on_click());

            TOOLS.option_update_icon(tool, option_name);
        };
    }

    ,options_enable : function(tool) {
        if (tool.options!==undefined) {
            UI.log('enabling options for:', tool);

            for(const option_name in tool.options) {
                let option = tool.options[option_name];
                let handler = TOOLS.option_get_click_handler(tool, option_name, option);

                option.ctx = this.MENU_options.add('root'
                    , option_name
                    , handler
                    , 'canvas'
                    , option.tooltip||option_name)[1].getContext('2d');

                option.handler = handler;

                TOOLS.option_update_icon(tool, option_name);
            }
        }
    }

    ,options_disable : function(tool) {
        if (tool.options!==undefined) {
            for(const option_name in tool.options) {
                this.MENU_options.drop(option_name);
            }
        }
    }


    ,show : function(tool) {
        let ctx = TOOLS.canvas.getContext('2d');
        ctx.clearRect(0, 0, TOOLS.canvas.width, TOOLS.canvas.height);
        UI.draw_glyph(tool.icon, ctx);
    }

    ,activate : function(tool_name, background, button) {
        background = (background===undefined)?false:background;
        button = (button===undefined)?0:button;

        if (!(button in TOOLS.alt_tools))
            TOOLS.alt_tools[button] = tool_name;

        let tool = TOOLS.tools[tool_name];
        let prev = TOOLS.current;

        if (tool==prev)
            return;

        TOOLS.previous.push(prev);

        if (TOOLS.background!=null) {
            if (!background)
                TOOLS.previous.push(tool);
        } else {
            TOOLS.show(tool);
        }

        if (tool.on_activated!==undefined)
            tool.on_activated();
        tool._activated_by = button;

        if (background) {
            TOOLS.background = tool;
        } else {
            if (prev!=null) {
                TOOLS.deactivate(prev);
                TOOLS.options_disable(prev);
            }
            TOOLS.options_enable(tool);
            TOOLS.current = tool;
        }

        return;
    }

    ,reactivate_default : function() {
        TOOLS.activate(TOOLS.alt_tools[0], false, 0);
        BRUSH.activate_color(0);
    }

    ,deactivate_backtool : function() {
        if (TOOLS.background!=null) {
            let prev = TOOLS.previous.pop();
            TOOLS.show(prev);
            TOOLS.background = null;
        }
    }

    ,deactivate : function(tool) {
        tool = (tool===undefined)?TOOLS.current:tool;
        (tool.on_deactivated!==undefined)&&tool.on_deactivated();
    }

    ,init : function(MENU_main, MENU_options) {
        this.MENU_main = MENU_main;
        this.MENU_options = MENU_options;

        // shows current tool (pen / eraser / texter).
        [TOOLS.div, TOOLS.canvas] = this.MENU_main.add('root', 'tools', null, 'canvas');

        UI.addEventListener('on_key_down', TOOLS.on_key_down);
        UI.addEventListener('on_key_up', TOOLS.on_key_up);
        UI.addEventListener('on_wheel', TOOLS.on_wheel);
        UI.addEventListener('on_start', TOOLS.on_start);
        UI.addEventListener('on_move', TOOLS.on_move);
        UI.addEventListener('on_stop', TOOLS.on_stop);
        UI.addEventListener('on_paste_strokes', TOOLS.on_paste_strokes);
        UI.addEventListener('on_paste_text', TOOLS.on_paste_text);
        UI.addEventListener('on_blur', TOOLS.on_blur);
        UI.addEventListener('on_focus', TOOLS.on_focus);
    }

    ,_tool_activator : function(tool_name) {
        return (e, id, long)=>{ // eslint-disable-line no-unused-vars
            TOOLS.alt_tools[e.button] = tool_name;
            if (e.button==0)
                TOOLS.activate(tool_name, false, 0); // immediately activate selected tool
            else
                UI.toast('tools', e.button + ' => ' + tool_name, 1000); // assign alt button to activate the tool
            return true;
        };
    }

    ,add_tool : function(tool, visible, title) {
        visible = (visible===undefined)?true:visible;

        TOOLS.tools[tool.name] = tool;

        if (visible) {
            [tool.div, tool.canvas] = this.MENU_main.add(
                'tools'
                , tool.name
                , TOOLS._tool_activator(tool.name)
                , 'canvas', title
            );

            UI.draw_glyph(tool.icon, tool.canvas.getContext('2d'));
        }
    }

    ,_key_match : function(key, background_key) {
        if (background_key == key) { // key itself
            return true;
        } else if (Array.isArray(background_key)) { // list of key combos
            for(let i=0; i<background_key.length; i++) {
                if ((UI.keys[background_key[i][0]])&&(background_key[i][1] == key))
                    return true;
            }
        }
        return false;
    }

    ,_handled : function(tool, event, args) {
        return (
            (tool!=null)&&
            (event in tool)&&
            (tool[event]!=undefined)&&
            (tool[event].apply(tool, args))
        );
    }

    ,_tools_handle : function(event, args) {
        if (TOOLS._handled(TOOLS.background, event, args))
            return true;

        if (TOOLS._handled(TOOLS.current, event, args))
            return true;

        return false;
    }

    // events
    ,on_key_down : function(key) {
        if (TOOLS._tools_handle('on_key_down', [key]))
            return true;

        for (const tool_name in TOOLS.tools) {
            const tool = TOOLS.tools[tool_name];

            if (TOOLS._key_match(key, tool.background_key)) {
                TOOLS.activate(tool_name, true, -1); // activate as a background tool
                return true;

            } else if ((tool.shortcut!==undefined)&&(UI.keys[tool.shortcut[0]])&&(tool.shortcut[1] == key)) {
                TOOLS.activate(tool_name, false, 0); // activate as a foreground
                return true;
            }
        }

        if (key=='Escape') {
            TOOLS._tools_handle('cancel', []);
        }

        return false;
    }

    ,on_key_up : function(key) {
        if (TOOLS._tools_handle('on_key_up', [key]))
            return true;

        if ((TOOLS.background!=null)&&(TOOLS._key_match(key, TOOLS.background.background_key)))
            TOOLS.deactivate_backtool();

        return false;
    }

    ,on_wheel : function(delta) {
        if (TOOLS._tools_handle('on_wheel', [delta]))
            return true;
        return false;
    }

    ,on_start : function(lp, button) {
        const point = copy(lp);
        const background = (TOOLS.background!=null)&&(TOOLS.background.on_start!=undefined);
        let handled = false;

        if ((background)&&(TOOLS.background.on_start(point, button))) {
            handled = true;
        } else {
            if (button!=0) {
                BRUSH.activate_color(button);
                if (button in TOOLS.alt_tools)
                    TOOLS.activate(TOOLS.alt_tools[button], false, button);
            }
            handled = ((TOOLS.current.on_start!=undefined)&&(TOOLS.current.on_start(point, button)));
        }
        return handled;
    }

    ,on_move : function(lp) {
        if (TOOLS._tools_handle('on_move', [copy(lp)]))
            return true;
        return false;
    }

    ,on_stop : function(lp) {
        const point = copy(lp);
        const background = (TOOLS.background!=null)&&(TOOLS.background.on_stop!=undefined);
        let handled = false;

        if ((background)&&(TOOLS.background.on_stop(point))) {
            handled = true;
        } else {
            handled = ((TOOLS.current.on_stop!=undefined)&&(TOOLS.current.on_stop(point)));
            if (!TOOLS.current.is_capturing)
                TOOLS.reactivate_default();
        }
        return handled;
    }

    ,on_paste_strokes : function(strokes) {
        if (TOOLS._tools_handle('on_paste_strokes', [strokes]))
            return true;
        return false;
    }

    ,on_paste_text : function(text) {
        if (TOOLS._tools_handle('on_paste_text', [text]))
            return true;
        return false;
    }

    ,on_blur : function() {
        TOOLS.deactivate_backtool();
        TOOLS.deactivate();
    }

    ,on_focus : function() {
        if (TOOLS.current===undefined)
            return;

        TOOLS.current.on_activated();
    }

};

export {TOOLS};
