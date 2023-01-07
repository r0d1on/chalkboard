'use strict';

import {_class} from '../base/objects.js';

import {UI} from '../ui/UI.js';

let Settings = {
    ITEMS : {}
    ,VALUES : {}

    ,icon : [null,[23,53],[20,54],[16,54],null,[7,44],[7,40],[8,37],[10,34],[13,32],[17,32],[20,32],[23,33],[26,35],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],null,[10,44],[11,41],[14,38],[18,38],[21,40],[23,43],[22,47],[20,49],null,[7,44],[8,46],null,[16,54],[20,49],null,[10,44],[8,46],null,[18,52],[20,49],[24,49],[26,44],[25,40],[22,36],[18,35],[14,36],[11,38],[10,44],null,[8,46],[7,44],[7,40],[8,37],[10,34],null,[13,32],[17,32],[20,32],[26,35],null,[23,33],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],[20,54],[16,54],[20,49],[22,50],[24,49],[26,44],[25,40],[22,36],null,[18,35],[14,36],[11,38],[9,43],null,[25,40],[26,35],[25,40],null,[37,8],[40,7],[43,7],null,[54,15],[54,19],[53,22],[51,25],[49,27],[45,29],[42,29],[39,28],[36,26],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],null,[50,15],[50,19],[47,21],[44,23],[40,21],[38,18],[38,14],[40,11],null,[54,15],[52,14],null,[43,7],[40,11],null,[50,15],[52,14],null,[42,9],[40,11],[36,13],[35,17],[36,21],[39,25],[44,26],[48,24],[50,21],[50,15],null,[52,14],[54,15],[54,19],[53,22],[51,25],null,[49,27],[45,29],[42,29],[36,26],null,[39,28],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],[40,7],[43,7],[40,11],[38,11],[36,13],[35,17],[36,21],[39,25],null,[44,26],[48,24],[50,21],[52,17],null,[36,21],[36,26],[36,21],null,[26,35],[36,26],null,[23,33],[33,23],null,[28,38],[39,28],[26,35],null,[28,38],[39,28],null,[26,35],[36,26],[23,33],[33,23],[23,33],[36,26]]
    ,MENU_main : null

    /* Class Methods*/

    ,load_values : function() {
        let values = localStorage.getItem('settings');
        if (values==null)
            Settings.VALUES = {};
        else
            Settings.VALUES = JSON.parse(values);
    }

    ,save_values : function() {
        try {
            localStorage.setItem('settings', JSON.stringify(Settings.VALUES));
        } catch (error) {
            UI.log(0, ' can\'t save settings to local storage: ' + error);
        }
    }

    ,on_persist : function(json, is_sync) {
        json.modules['settings'] = Settings.VALUES;
        if ((is_sync)&&((UI.view_mode=='follow')))
            json.modules['settings']= {};
    }

    ,on_unpersist : function(json, is_sync) {
        if ((is_sync)&&(UI.view_mode=='lead'))
            return;
        let values = json.modules['settings'];
        if (values !== undefined) {
            for(let key in values) {
                if ((key in Settings.VALUES)&&(Settings.VALUES[key]!=values[key])) {
                    Settings.VALUES[key] = values[key];
                    if (key in Settings.ITEMS) {
                        Settings.ITEMS[key].value = values[key];
                        Settings.ITEMS[key].on_change();
                        Settings.ITEMS[key].redraw_icon();
                    }
                }
            }
        }
    }

    ,init : function(MENU_main) { // class function
        Settings.MENU_main = MENU_main;
        let ctx = MENU_main.add('root', 'settings', null, 'canvas')[1].getContext('2d');
        UI.draw_glyph(Settings.icon, ctx);
        Settings.load_values();

        UI.addEventListener('on_persist', Settings.on_persist);
        UI.addEventListener('on_unpersist', Settings.on_unpersist);
    }

    ,add_item : function(item, title) { // class function
        item.attach(Settings.MENU_main, 'settings', title);
        let saved_value = Settings.VALUES[item.name];
        if (saved_value!==undefined) {
            item.value = saved_value;
            item.redraw_icon();
        } else {
            Settings.VALUES[item.name] = item.value;
            Settings.save_values();
        }
    }

    /* Instance methods */

    ,Settings : function(name, default_value, icons, on_change) {
        this.name = name;
        this.icons = icons;
        this.on_change = on_change;
        this.canvas = null;
        this.value = default_value;
    }

    ,attach : function(menu, parent_name, title) {
        let that = this;
        let canvas = menu.add(parent_name, this.name, ()=>{that.on_item_click();}, 'canvas', title)[1];
        this.canvas = canvas;
        Settings.ITEMS[this.name] = this;
        this.redraw_icon();
    }

    ,redraw_icon : function() {
        this.canvas.width = this.canvas.width + 1 - 1;
        let ctx = this.canvas.getContext('2d');
        UI.draw_glyph(this.icons[this.value], ctx);
    }

    ,on_item_click : function() {
        this.value = (this.value + 1) % this.icons.length;
        this.redraw_icon();
        this.on_change();
        Settings.VALUES[this.name] = this.value;
        Settings.save_values();
    }

    ,on_change : function() {}
};

Settings = _class('Settings', Settings);

export {Settings};
