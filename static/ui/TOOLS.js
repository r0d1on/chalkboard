'use strict';

import {copy} from '/base/objects.js';

import {UI} from './UI.js';


// TOOLS CONTAINER
let TOOLS = {
    canvas : null
    ,div : null
    
    ,tools : {}
    
    ,previous : []
    
    ,current : null
    ,background : null
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
            console.log('enabling options for:', tool);

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
        this.MENU_main.hide('tools');
    }
    
    ,activate : function(tool_name, background) {
        background = (background===undefined)?false:background;
        
        let tool = TOOLS.tools[tool_name];
        let prev = TOOLS.current;
        
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
                (prev.on_deactivated!==undefined)&&prev.on_deactivated();            
                TOOLS.options_disable(prev);
            }
            TOOLS.options_enable(tool);
            TOOLS.current = tool;
        }

    }
    
    ,deactivate_backtool : function() {
        let prev = TOOLS.previous.pop();
        TOOLS.show(prev);
        TOOLS.background = null;
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
    }
    
    ,add_tool : function(tool, visible, title) {
        visible = (visible===undefined)?true:visible;
        
        TOOLS.tools[tool.name] = tool;
        
        if (visible) {
            [tool.div, tool.canvas] = this.MENU_main.add('tools', tool.name, ((tool_name)=>{
                return ()=>{
                    TOOLS.activate(tool_name);
                };
            })(tool.name), 'canvas', title);
            
            UI.draw_glyph(tool.icon, tool.canvas.getContext('2d'));
        }
        
    }
    
    // events
    ,on_key_down : function(key) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_key_down!=undefined)&&(TOOLS.background.on_key_down(key))) {
            return true;
        }
        if ((TOOLS.current.on_key_down!=undefined)&&(TOOLS.current.on_key_down(key))) {
            return true;
        }

        for (const tool_name in TOOLS.tools) {
            const tool = TOOLS.tools[tool_name];
            if (tool.activation_key == key) {
                TOOLS.activate(tool_name, true); // activate as a background tool
                return true;
            } else if ((tool.shortcut!==undefined)&&(UI.keys[tool.shortcut[0]])&&(tool.shortcut[1] == key)) {
                TOOLS.activate(tool_name); // activate as a foreground
                return true;
            }
        }
        
        if (key=='Escape') {
            (TOOLS.background!=null)&&(TOOLS.background.cancel!=undefined)&&(TOOLS.background.cancel());
            (TOOLS.current!=null)&&(TOOLS.current.cancel!=undefined)&&(TOOLS.current.cancel());
        }
        
        return false;
    }
 
    ,on_key_up : function(key) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_key_up!=undefined)&&(TOOLS.background.on_key_up(key))) {
            return true;
        } else if ((TOOLS.current.on_key_up!=undefined)&&(TOOLS.current.on_key_up(key))) {
            return true;
        }

        if ((TOOLS.background!=null)&&(TOOLS.background.activation_key==key)) 
            TOOLS.deactivate_backtool(); // deactivate background tool
        
        return false;
    }
    
    ,on_wheel : function(delta) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_wheel!=undefined)&&(TOOLS.background.on_wheel(delta))) {
            return true;
        } else if ((TOOLS.current.on_wheel!=undefined)&&(TOOLS.current.on_wheel(delta))) {
            return true;
        }
        return false;
    }
    
    ,on_start : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_start!=undefined)&&(TOOLS.background.on_start(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_start!=undefined)&&(TOOLS.current.on_start(copy(lp)))) {
            return true;
        }
        return false;
    }
    
    ,on_move : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_move!=undefined)&&(TOOLS.background.on_move(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_move!=undefined)&&(TOOLS.current.on_move(copy(lp)))) {
            return true;
        }
        return false;
    }    
    
    ,on_stop : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_stop!=undefined)&&(TOOLS.background.on_stop(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_stop!=undefined)&&(TOOLS.current.on_stop(copy(lp)))) {
            return true;
        }
        return false;
    }    

    ,on_paste_strokes : function(strokes) {
        //console.log('strokes:',strokes);
        if ((TOOLS.background!=null)&&(TOOLS.background.on_paste_strokes!=undefined)&&(TOOLS.background.on_paste_strokes(strokes))) {
            return true;
        } else if ((TOOLS.current.on_paste_strokes!=undefined)&&(TOOLS.current.on_paste_strokes(strokes))) {
            return true;
        }
        return false;
    }    
    
};

export {TOOLS};
