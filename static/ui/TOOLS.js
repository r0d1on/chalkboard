'use strict';

import {BRUSH} from './BRUSH.js';
import {UI} from './UI.js';


// TOOLS CONTAINER
let TOOLS = {
    canvas : null
    ,div : null

    ,EVENTS : [
        'on_key_down','on_key_up','on_wheel',
        'on_start','on_move','on_stop',
        'on_paste_strokes','on_paste_text',
        'on_blur','on_focus','on_resize',
        'on_file',
        'on_before_redraw','on_after_redraw'
    ]
    ,_event_handlers : {}

    ,tools : {}

    ,previous : []

    ,current : null
    ,background : null
    ,binding : {} // mouse button -> tool name

    ,MENU_main : null
    ,MENU_options : null


    ,option_update_icon : function(tool, option_name) {
        let option = tool.options[option_name];
        let option_value = tool[option_name];
        let icon_color = (option_value==0)?'#555':undefined;
        let icon_idx = (option.type=='binary')?0:option_value;
        let icon = option.icon[icon_idx]||tool.icon;
        option.ctx.canvas.width = option.ctx.canvas.width+1-1;
        UI.draw_glyph(icon, option.ctx, icon_color);
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
            UI.log(1, 'enabling options for:', tool);

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
        const canvas = TOOLS.MENU_main.items['tools'].dom.children['tools_g'];
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        UI.draw_glyph(tool.icon, ctx);
    }

    ,activate : function(tool_name, background=false, button=0, key) {
        if (!(button in TOOLS.binding))
            TOOLS.binding[button] = tool_name;

        for(let b in TOOLS.binding) {
            let toast = UI.toast('binding_' + b, null, null, null, null);
            if (toast!=null)
                toast.set_bold(b==button);
        }

        let tool = TOOLS.tools[tool_name];
        let prev = TOOLS.current;

        tool._activated_by = button;
        tool._activated_by_key = key;

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
        TOOLS.activate(TOOLS.binding[0], false, 0);
        BRUSH.activate_color(0);
    }

    ,deactivate_backtool : function() {
        if (TOOLS.background!=null) {
            let prev = TOOLS.previous.pop();
            TOOLS.show(prev);
            TOOLS.background = null;
        }
    }

    ,deactivate : function(tool=TOOLS.current) {
        (tool.on_deactivated!==undefined)&&tool.on_deactivated();
    }

    ,init : function(MENU_main, MENU_options) {
        this.MENU_main = MENU_main;
        this.MENU_options = MENU_options;

        this.MENU_main.add('root', 'tools', null, 'canvas');

        TOOLS.EVENTS.map((event)=>{
            UI.addEventListener(event, TOOLS[event]);
            TOOLS.EVENTS.push(event + '_resident');
        });

        TOOLS.EVENTS.map((event)=>{
            TOOLS._event_handlers[event] = [];
        });

        TOOLS._event_handlers[''] = [];
    }

    ,_tool_selected : function(tool_name) {
        return (e, id, long)=>{ // eslint-disable-line no-unused-vars
            TOOLS.binding[e.button] = tool_name;
            if (e.button==0)
                TOOLS.activate(tool_name, false, 0); // immediately activate default tool
            else {
                // for alternative tool - create / update binding description toast
                let toast = UI.toast(
                    'binding_' + e.button
                    ,e.button + ' :: ' + tool_name
                    ,-1 // permanent
                    ,2 // bottom right
                    ,false // do not reset
                );
                toast.set_text(e.button + ' :: ' + tool_name);
            }
            return true;
        };
    }

    ,add_tool : function(tool, visible=true, title) {
        TOOLS.tools[tool.name] = tool;

        TOOLS.EVENTS.map((event)=>{
            if (event in tool)
                TOOLS._event_handlers[event].push(tool);
        });

        if (visible) {
            this.MENU_main.add_icon(
                'tools', tool.name,
                tool.icon, title,
                TOOLS._tool_selected(tool.name)
            );
        }
    }

    ,_key_match : function(key, combo_list) {
        if (combo_list == key) { // key itself
            return true;
        } else if (Array.isArray(combo_list)) { // list of key combos
            if (!Array.isArray(combo_list[0]))
                combo_list = [combo_list];
            for(let i = 0; i < combo_list.length; i++) {
                const combo = combo_list[i];
                if (combo===undefined)
                    continue;
                if ((UI.keys[combo[0]])&&(combo[1] == key))
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

        if (event!='cancel')
            TOOLS._event_handlers[event + '_resident'].map((tool)=>{
                TOOLS._handled(tool, event + '_resident', args);
            });

        return false;
    }

    // events
    ,on_key_down : function(key) {
        if (TOOLS._tools_handle('on_key_down', [key]))
            return true;

        for (const tool_name in TOOLS.tools) { // check hot-keys
            const tool = TOOLS.tools[tool_name];

            if (TOOLS._key_match(key, tool.background_key)) {
                TOOLS.activate(tool_name, true, -1, key); // activate as a background tool
                return true;

            } else if (TOOLS._key_match(key, tool.shortcut)) {
                TOOLS.binding[0] = tool_name; // same as selecting the tool from the menu
                TOOLS.activate(tool_name, false, 0, key); // activate as a foreground
                return true;
            }
        }

        if (key=='Escape')
            TOOLS._tools_handle('cancel', []);

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
        const point = lp.copy();
        const background = (TOOLS.background!=null)&&(TOOLS.background.on_start!=undefined);
        let handled = false;

        if ((background)&&(TOOLS.background.on_start(point, button))) {
            handled = true;
        } else {
            if (button!=0) {
                BRUSH.activate_color(button);
                if (button in TOOLS.binding)
                    TOOLS.activate(TOOLS.binding[button], false, button);
            }
            handled = ((TOOLS.current.on_start!=undefined)&&(TOOLS.current.on_start(point, button)));
        }
        return handled;
    }

    ,on_move : function(lp) {
        if (TOOLS._tools_handle('on_move', [lp.copy()]))
            return true;
        return false;
    }

    ,on_stop : function(lp) {
        const point = lp.copy();
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

    ,on_file : function(file) {
        if (TOOLS._tools_handle('on_file', [file]))
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

    ,on_resize : function() {
        TOOLS.show(TOOLS.current);

        if (TOOLS._tools_handle('on_resize', []))
            return true;
        return false;
    }

    ,on_after_redraw : function() {
        if (TOOLS._tools_handle('on_after_redraw', []))
            return true;
        return false;
    }

    ,on_before_redraw : function() {
        if (TOOLS._tools_handle('on_before_redraw', []))
            return true;
        return false;
    }

};

export {TOOLS};
