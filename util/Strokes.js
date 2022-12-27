'use strict';

import {_class, has, is_instance_of} from '../base/objects.js';

import {Point} from './Point.js';

import {UI} from '../ui/UI.js';
import {BRUSH} from '../ui/BRUSH.js';
import {BOARD} from '../ui/BOARD.js';


let Stroke = {
    STROKE_TYPES : {
    }

    ,Stroke : function() {
        this.erased = undefined; // id of the erasure stroke
    }

    ,is_hidden : function() {
        return (
            (this.erased!==undefined)&&
            (this.erased!==null)&&
            (this.erased[0]!='-')
        );
    }

    ,erased_by : function(eraser_id) {
        return (
            (this.erased == eraser_id)||
            (this.erased == '-' + eraser_id)
        );
    }

    ,flip_by : function(eraser_id) {
        if (this.erased!=undefined) {
            if (this.erased[0]=='-') {
                this.erased = this.erased.substr(1);
                if ((eraser_id!==undefined)&&(this.erased!=eraser_id))
                    throw 'stroke ' + this + ' flipped from '+this.erased+' by '+eraser_id;
            } else {
                this.erased = '-' + this.erased;
            }
        } else {
            this.erased = eraser_id;
        }
        return [this];
    }

    ,draw : function(ctx) { // eslint-disable-line no-unused-vars
        if (this.is_hidden())
            return false;
        return true;
    }

    ,str : function() {
        let ret = [];
        for(const k in this) {
            if ((has(this, k))&&(!k.startsWith('__'))&&(this[k]!==undefined)) {
                let value = this[k];
                if ((typeof(value)=='object')&&('str' in value)&&(typeof(value['str']) == 'function')) {
                    ret.push(k + ':' + value.str());
                } else {
                    ret.push(k + ':' + value);
                }
            }
        }
        return '<' + this.__classname + ':: ' + ret.join(' , ') + '>';
    }

    ,selection : function() {return [];}
    ,touched_by : function(gp) {return false;} // eslint-disable-line no-unused-vars

    ,_register_json_class : function(type_code, klass) {
        Stroke.STROKE_TYPES[type_code] = klass;
    }

    ,_from_json : function(json, blocked_fields) {
        const fields = new Set(blocked_fields);
        for(const key in json) {
            if ((!fields.has(key))&&(json[key]!==undefined))
                this[key] = json[key];
        }
    }

    ,from_json : function(json) {
        let type_code = json['@'];
        if (type_code in Stroke.STROKE_TYPES) {
            let klass = Stroke.STROKE_TYPES[type_code];
            delete json['@'];
            return klass._from_json(json);
        } else {
            throw 'unknown stroke type code: ' + type_code + ' in json : ' + JSON.stringify(json);
        }
    }

    ,_to_json : function(json, blocked_fields) {
        const fields = new Set(blocked_fields);
        for(const key in this) {
            if (key.startsWith('__')||(!has(this, key)))
                continue;
            if ((!fields.has(key))&&(this[key]!==undefined))
                json[key] = this[key];
        }
    }

    ,to_json : function() {
        for(let type_code in Stroke.STROKE_TYPES) {
            let klass = Stroke.STROKE_TYPES[type_code];
            if (is_instance_of(this, klass)) {
                let json = klass._to_json.call(this);
                json['@'] = type_code;
                return json;
            }
        }
        throw 'do not know how to_json object : ' + typeof(this) + ' : ' + this;
    }

};
Stroke = _class('Stroke', Stroke);

let LineStroke = {
    super :  Stroke

    ,LineStroke : function(p0, p1, color, width) {
        Stroke.__init__.call(this);
        this.p0 = p0;
        this.p1 = p1;
        this.color = color;
        this.width = width;
    }

    ,draw : function(ctx) {
        if (!Stroke.draw.call(this))
            return false;
        let lp0 = UI.global_to_local(this.p0);
        let lp1 = UI.global_to_local(this.p1);
        UI.draw_line(lp0, lp1, this.color, this.width * UI.viewpoint.scale, ctx);
    }

    ,rect : function() {
        return UI.get_rect([this.p0, this.p1]);
    }

    ,selection : function(rect) {
        if (this.is_hidden())
            return [];

        return [0,1].reduce((s, point_idx)=>{
            let p = this.get_point(point_idx);
            let take = (rect===undefined)||(
                (rect[0].y<=p.y)&&(p.y<=rect[1].y)&&
                (rect[0].x<=p.x)&&(p.x<=rect[1].x)
            );
            if (take)
                s.push({
                    commit_id : this.commit_id
                    ,stroke_idx : this.stroke_idx
                    ,stroke_id : this.stroke_id
                    ,point_idx : point_idx
                });
            return s;
        }, []);
    }

    ,touched_by : function(gp) {
        let dst = gp.dst2seg(this.p0, this.p1);
        return (dst < ((BRUSH.size + this.width)/2.0));
    }

    ,get_point : function(point_idx) {
        return this['p' + point_idx];
    }

    ,set_point : function(point_idx, point) {
        this['p' + point_idx] = point;
    }

    ,copy : function() {
        let stroke = LineStroke.new(this.p0.copy(), this.p1.copy(), this.color, this.width);
        stroke.commit_id = this.commit_id;
        stroke.stroke_id = this.stroke_id;
        stroke.stroke_idx = this.stroke_idx;
        //version
        return stroke;
    }

    ,to_local : function() {
        this.p0 = UI.global_to_local(this.p0);
        this.p1 = UI.global_to_local(this.p1);
        this.width *= UI.viewpoint.scale;
        return this;
    }

    ,to_global : function() {
        this.p0 = UI.local_to_global(this.p0);
        this.p1 = UI.local_to_global(this.p1);
        this.width /= UI.viewpoint.scale;
        return this;
    }

    ,shift : function(dp, scale) {
        this.p0 = this.p0.add(dp, scale);
        this.p1 = this.p1.add(dp, scale);
        return this;
    }

    ,_to_json : function() {
        let json = {
            p : [this.p0.to_json(), this.p1.to_json()]
            ,w : this.width
            ,c : this.color
        };
        Stroke._to_json.call(this, json, ['p0', 'p1', 'width', 'color']);
        return json;
    }

    ,_from_json : function(json) {
        let stroke = LineStroke.new(
            Point.from_json(json.p[0])
            ,Point.from_json(json.p[1])
            ,json.c
            ,json.w
        );
        Stroke._from_json.call(stroke, json, ['p', 'c', 'w']);
        return stroke;
    }

};
LineStroke = _class('LineStroke', LineStroke);
Stroke._register_json_class('l', LineStroke);


let ErasureStroke = {
    super :  Stroke
    ,ErasureStroke : function() {
        Stroke.__init__.call(this);
    }
    ,draw : function(){}

    ,flip_strokes : function(strokes, eraser_id, finalize) {
        let flipped = strokes.reduce((sub, stroke)=>{
            stroke.flip_by(eraser_id).map((flipped_stroke)=>{
                sub.push(flipped_stroke);
                flipped_stroke.version = BOARD.version;
            });
            return sub;
        }, []);

        if (finalize)
            BOARD.commit_stroke(ErasureStroke.new());

        return flipped;
    }

    ,flip_by : function(eraser_id) { // eslint-disable-line no-unused-vars
        let flipped = [];
        for(let commit_id in BOARD.strokes) {
            let strokes_group = BOARD.strokes[commit_id];
            for(let i in strokes_group) {
                if (strokes_group[i].erased_by(this.stroke_id))
                    flipped.push(strokes_group[i]);
            }
        }
        return ErasureStroke.flip_strokes(flipped, this.stroke_id);
    }

    ,_to_json : function() {
        let json = {};
        Stroke._to_json.call(this, json, []);
        return json;
    }

    ,_from_json : function(json) {
        let stroke = ErasureStroke.new();
        Stroke._from_json.call(stroke, json, []);
        return stroke;
    }
};
ErasureStroke = _class('ErasureStroke', ErasureStroke);
Stroke._register_json_class('d', ErasureStroke);

let ImageStroke = {
    super :  Stroke

    ,ImageStroke : function(image, p0, p1) {
        Stroke.__init__.call(this);
        this.p0 = p0;
        this.p1 = p1;
        this.image = image;
    }

    ,draw : function(ctx) {
        if (!Stroke.draw.call(this))
            return false;
        let lp0 = UI.global_to_local(this.p0);
        let lp1 = UI.global_to_local(this.p1);
        ctx.drawImage(this.image
            ,lp0.x
            ,lp0.y
            ,lp1.x - lp0.x
            ,lp1.y - lp0.y
        );
    }

    ,rect : function() {
        return UI.get_rect([this.p0, this.p1]);
    }

    ,selection : function(rect) {
        if (this.is_hidden())
            return [];

        let W = BRUSH.get_local_width();

        // "all" selected
        let selected = (rect===undefined);

        // "point" picked
        selected = selected || ((this.touched_by(rect[0])) && (rect[0].dst2(rect[1]) < W));

        /*
        selected = selected || (this.touched_by(rect[0]))||this.touched_by(rect[1]);
        selected = selected || (this.touched_by(Point.new(rect[0].x, rect[1].y)));
        selected = selected || (this.touched_by(Point.new(rect[1].x, rect[0].y)));
        */

        // within the selection rect
        selected = selected || (
            (rect[0].y <= this.p0.y)&&(this.p1.y <= rect[1].y)&&
            (rect[0].x <= this.p0.x)&&(this.p1.x <= rect[1].x)
        );

        if (selected) {
            return [0, 1].reduce((s, point_idx)=>{
                //let p = this.get_point(point_idx);
                s.push({
                    commit_id : this.commit_id
                    ,stroke_idx : this.stroke_idx
                    ,stroke_id : this.stroke_id
                    ,point_idx : point_idx
                });
                return s;
            }, []);
        } else {
            return [];
        }

    }

    ,touched_by : function(gp) {
        return (
            (this.p0.y <= gp.y)&&(gp.y <= this.p1.y)&&
            (this.p0.x <= gp.x)&&(gp.x <= this.p1.x)
        );
    }

    ,get_point : function(point_idx) {
        return this['p' + point_idx];
    }

    ,copy : function() {
        let stroke = ImageStroke.new(this.image, this.p0.copy(), this.p1.copy());
        stroke.commit_id = this.commit_id;
        stroke.stroke_id = this.stroke_id;
        stroke.stroke_idx = this.stroke_idx;
        //version
        return stroke;
    }

    ,to_local : function() {
        this.p0 = UI.global_to_local(this.p0);
        this.p1 = UI.global_to_local(this.p1);
        return this;
    }

    ,to_global : function() {
        this.p0 = UI.local_to_global(this.p0);
        this.p1 = UI.local_to_global(this.p1);
        return this;
    }

    ,shift : function(dp, scale) {
        this.p0 = this.p0.add(dp, scale);
        this.p1 = this.p1.add(dp, scale);
        return this;
    }

    ,_to_json : function() {
        let json = {
            p : [this.p0.to_json(), this.p1.to_json()]
            ,s : this.image.src
        };
        Stroke._to_json.call(this, json, ['p0', 'p1', 'image']);
        return json;
    }

    ,_from_json : function(json) {
        let image = new Image();
        image.src = json.s;
        let stroke = ImageStroke.new(image, Point.from_json(json.p[0]), Point.from_json(json.p[1]));
        Stroke._from_json.call(stroke, json, ['p', 's']);
        return stroke;
    }
};
ImageStroke = _class('ImageStroke', ImageStroke);
Stroke._register_json_class('i', ImageStroke);

export {Stroke, LineStroke, ErasureStroke, ImageStroke};
