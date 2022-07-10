"use strict";

import {_class} from '../base/objects.js';

var Menu = _class("Menu", {

     SIZE : 60
    ,LONG_CLICK_DELAY : 1000
    ,COLOR0 : "#666D"
    ,COLOR1 : "#555D"

    ,Menu : function(root_name, root_div_id, top) {
        this.id = root_div_id;
        this.container = document.getElementById(this.id);
        
        this.top = (top===undefined)?true:top;
        
        if (this.top) {
            this.container.style['top'] = "0px";
            this.container.style['bottom'] = undefined;
        } else {
            this.container.style['top'] = undefined;
            this.container.style['bottom'] = "0px";
        };
        
        this.tree = {};
        this.tree[root_name] = this._new_item(null, this.container, null, 0, 0);
    }

    ,_new_item : function(dom, rdom, pid, top, left) {
        return {
             dom : dom
            ,rdom : rdom
            ,sub : []
            ,pid : pid
            ,horizontal : (pid==null) || (!this.tree[pid].horizontal)
            ,top : top
            ,left : left
        };
    }
    
    ,hide : function(id, x) {
        if (id == null) 
            return;

        if (id != 'root') 
            this.tree[id].rdom.style['display'] = "none";

        this.tree[id].sub.map((sid)=>{
            if (sid != x) this.hide(sid);
        });

        if (x != undefined)
            this.hide(this.tree[id].pid, id);
    }
    
    ,show : function(id) {
        this.tree[id].rdom.style['display'] = "block";
    }
    
    ,onpush : function(id) {
        var that = this;
        function handler(e) {
            that.tree[id]._push = (new Date()).valueOf();
        };
        return handler;
    }
    
    ,onclick : function(id, onclk) {
        var that = this;
        return (e) => {
            var long = ((new Date()).valueOf() - that.tree[id]._push) > Menu.LONG_CLICK_DELAY;
            
            //console.log("menu:", id);
            
            if ( ( onclk != undefined ) && ( onclk != null ) && ( !onclk(e, id, long) ) ) {
                //console.log(id, e, " - cancelled");
                return
            };
            
            if (that.tree[id].sub.length > 0) {
                that.hide(that.tree[id].pid, id);
                if (that.tree[id].rdom.style['display']=="none") {
                    that.show(id);
                } else {
                    that.hide(id);
                };
            } else {
                that.hide("root");
            };
        };
    }

    
    ,get_menu_block : function(type, id) {
        var elem = document.createElement(type);
        elem.id = id;
        elem.style['width'] = Menu.SIZE;
        elem.style['height'] = Menu.SIZE;
        if (type=="canvas") {
            elem.width = Menu.SIZE;
            elem.height = Menu.SIZE;
        };
        return elem;
    }
    
    ,add : function(pid, id, onclick, inner_type, title) {
        var parent = this.tree[pid];

        var elem = document.createElement("div");
        elem.id = id;
        elem.style['position'] = 'absolute';
        elem.style['width'] = Menu.SIZE + 'px';
        elem.style['height'] = Menu.SIZE + 'px';
        elem.style['background-color'] = Menu.COLOR0;
        elem.addEventListener("click", this.onclick(id, onclick));
        elem.addEventListener("mousedown", this.onpush(id));
        elem.title = title||"";

        var sub_elem = null;
        if (inner_type != undefined) {
            sub_elem = this.get_menu_block(inner_type, id + "_g");
            elem.appendChild(sub_elem);
        };

        var row = document.createElement("div");
        row.id = id + '_row';
        row.style['position'] = 'absolute';
        row.style['display'] = 'none';

        var top = parent.top;
        var left = parent.left;
        
        var top_prop = (this.top)?'top':'bottom';
        var bot_prop = (!this.top)?'top':'bottom';

        if (parent.horizontal) {
            left += parent.sub.length;
            top += 1;
            elem.style[top_prop]  = '0px';
            elem.style['left'] = Menu.SIZE * parent.sub.length + 'px';
            row.style[top_prop]   = Menu.SIZE * top + 'px';
            row.style['left']  = Menu.SIZE * left + 'px';
        } else {
            left += 1;
            top += parent.sub.length;
            elem.style[top_prop]  = Menu.SIZE * parent.sub.length + 'px';
            elem.style['left'] = '0px';
            row.style[top_prop]   = Menu.SIZE * top + 'px';
            row.style['left']  = Menu.SIZE * left + 'px';
        };

        this.tree[id] = this._new_item(elem, row, pid, top, left);
        
        parent.sub.push(id);
        parent.rdom.appendChild(elem);
        if (parent.dom != null) {
            parent.dom.style['background-color'] = Menu.COLOR1;
            if (!parent.horizontal) {
                parent.dom.style['border-'+bot_prop] = '3px solid black';
            } else {
                parent.dom.style['border-right'] = '3px solid black';
            };
        };
        
        this.tree['root'].rdom.appendChild(row);
        
        return [elem, sub_elem];
     }
    
    ,drop : function(id) {
        this.tree['root'].rdom.removeChild(this.tree[id].dom);
        this.tree['root'].rdom.removeChild(this.tree[id].rdom);
        
        var subelems = this.tree['root'].sub;
        var index = subelems.indexOf("input");
        subelems.splice(index, 1);
    }

});

export {Menu};
