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

    ,is_drawable : function() {
        return true;
    }

    ,erased_by : function(eraser_id) {
        return (
            (this.erased == eraser_id)||
            (this.erased == '-' + eraser_id)
        );
    }

    ,flip_by : function(eraser_id, register=true) { // ###
        if (this.erased!=undefined) {
            if (this.erased[0]=='-') {
                this.erased = this.erased.substr(1);
                if ( (eraser_id!==undefined) && (this.erased!=eraser_id) ) {
                    //throw 'stroke ' + this.stroke_id + ' flipped from '+this.erased+' by '+eraser_id;
                    console.error('stroke ' + this.stroke_id + ' flipped from ' + this.erased + ' by ' + eraser_id);
                    this.erased = eraser_id;
                }
            } else {
                this.erased = '-' + this.erased;
            }
        } else {
            this.erased = eraser_id;
        }
        if (register)
            BOARD.register(this);
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
                if ((typeof(value) == 'object') && ('str' in value) && (typeof(value['str']) == 'function')) {
                    ret.push(k + ':' + value.str());
                } else {
                    ret.push(k + ':' + value);
                }
            }
        }
        return '<' + this.__classname + ':: ' + ret.join(' , ') + '>';
    }

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

let RectableStroke = {
    super :  Stroke

    ,RectableStroke : function(p0, p1, width) {
        Stroke.__init__.call(this);
        this.p0 = p0;
        this.p1 = p1;
        this.width = width;
    }

    ,draw : function(gr) {
        if (!Stroke.draw.call(this))
            return false;

        if (gr===undefined)
            return true;

        if ( // if stroke is out of viewport bounds
            ((this.p0.x < gr[0].x) && (this.p1.x < gr[0].x))||
            ((gr[1].x < this.p0.x) && (gr[1].x < this.p1.x))||
            ((this.p0.y < gr[0].y) && (this.p1.y < gr[0].y))||
            ((gr[1].y < this.p0.y) && (gr[1].y < this.p1.y))
        ) {
            return false;
        }

        return true;
    }

    ,rect : function() {
        if  (this.__rect)
            return this.__rect;

        this.__rect = UI.get_rect([
            this.p0.shift(+this.width / 2),
            this.p0.shift(-this.width / 2),
            this.p1.shift(+this.width / 2),
            this.p1.shift(-this.width / 2)
        ]);

        return this.__rect;
    }

    ,center : function() {
        return this.p0.add(this.p1).mul(0.5);
    }

    ,get_point : function(point_idx) {
        return this['p' + point_idx];
    }

    ,set_point : function(point_idx, point) {
        this['p' + point_idx] = point;
    }

    ,shift : function(dp, scale) {
        this.p0 = this.p0.add(dp, scale);
        this.p1 = this.p1.add(dp, scale);
        return this;
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

    ,selection : function(rect) {
        if (this.is_hidden())
            return [];

        return [0, 1].reduce((s, point_idx)=>{
            let p = this.get_point(point_idx);
            let take = (rect===undefined)||(
                (rect[0].y<=p.y)&&(p.y<=rect[1].y)&&
                (rect[0].x<=p.x)&&(p.x<=rect[1].x)
            );
            if (take)
                s.push({
                    commit_id : this.commit_id,
                    stroke_id : this.stroke_id,
                    point_idx : point_idx
                });
            return s;
        }, []);
    }

    ,touched_by : function(gp, diameter=0) {
        return (
            (this.p0.y - diameter / 2 <= gp.y)&&(gp.y <= this.p1.y + diameter / 2)&&
            (this.p0.x - diameter / 2 <= gp.x)&&(gp.x <= this.p1.x + diameter / 2)
        );
    }

    ,intersection : function(p0, p1) {return null;} // eslint-disable-line no-unused-vars

    ,visible_cells : function*(grid) {
        let [[i0, j0], [i1, j1]] =  grid.rect_coords(this.rect());
        for(let i=i0; i<=i1; i++)
            for(let j=j0; j<=j1; j++)
                yield [i, j];
    }

};
RectableStroke = _class('RectableStroke', RectableStroke);

let LineStroke = {
    super :  RectableStroke

    ,LineStroke : function(p0, p1, color, width) {
        RectableStroke.__init__.call(this, p0, p1, width);
        this.color = color;
    }

    ,draw : function(ctx, gr) {
        if (!RectableStroke.draw.call(this, gr))
            return false;

        let lp0 = UI.global_to_local(this.p0);
        let lp1 = UI.global_to_local(this.p1);
        UI.draw_line(lp0, lp1, this.color, this.width * UI.viewpoint.scale, ctx);
        return true;
    }

    ,touched_by : function(gp, diameter=0) {
        let dst = gp.dst2seg(this.p0, this.p1);
        return dst < (this.width + diameter) / 2.0;
    }

    ,split_by : function(gp, trim=0) {
        let [, t] = gp.prj2seg(this.p0, this.p1);

        const d = this.p1.sub(this.p0);

        let t_trim = 0;

        if (t===undefined) { // if this is a point (zero length segment)
            t = 0.5;
            t_trim = 1;
        } else {
            t_trim = trim / this.p0.dst(this.p1);
        }

        let splitted = [];

        if (t - t_trim > 0) {
            let pd = this.p0.add(d.mul(t - t_trim));
            if (this.p0.dst(pd) > trim / 10)
                splitted.push(LineStroke.new(this.p0, pd, this.color, this.width));
        }

        if (t + t_trim < 1) {
            let pd = this.p0.add(d.mul(t + t_trim));
            if (this.p1.dst(pd) > trim / 10)
                splitted.push(LineStroke.new(pd, this.p1, this.color, this.width));
        }

        return splitted;
    }

    ,intersection : function(p0, p1, lw) {
        // self
        let p = UI.global_to_local(this.p0);
        let r = UI.global_to_local(this.p1).sub(p);
        let dt = (this.width * UI.viewpoint.scale) / p.dst(p.add(r));

        // outer segment
        let q = p0;
        let s = p1.sub(q);
        let du = (lw || 5) / p0.dst(p1);

        let rs = r.prod(s);
        let qp = q.sub(p);
        let qpr = qp.prod(r);

        let ip = null; // local intersection point
        let t = null;  // t (0..1) param for self
        let u = null;  // u (0..1) param for [p0, p1]

        if (rs==0) {
            if (qpr==0) {
                // collinear
                let rr = r.prod(r);
                if (rr==0) {
                    // self is a point
                    if (p.dst2seg(p0, p1) < lw + this.width * UI.viewpoint.scale) {
                        ip = p.copy();
                        t = 0;
                        u = p.prj2seg(p0, p1)[1];
                    } else {
                        // debugger;
                    }
                } else {
                    // If the interval between t0 and t1 intersects the interval [0, 1] then the line segments are collinear and overlapping;
                    /*
                    rr = r.mul(1 / rr);
                    let t0 = qp.prod(rr);
                    let t1 = t0 + s.prod(rr);
                    */
                    // debugger;
                }
            } else {
                // parallel non intersecting
            }
        } else {
            t = qp.prod(s) / rs;
            u = qp.prod(r) / rs;
            if ( (( 0 - dt <= t )&&( t <= 1 + dt )) && (( 0 - du <= u )&&( u <= 1 + du )) ) {
                ip = q.add(s.mul(u));
            }
        }

        return [ip, t, u];
    }

    ,copy : function() {
        let stroke = LineStroke.new(this.p0.copy(), this.p1.copy(), this.color, this.width);
        stroke.commit_id = this.commit_id;
        stroke.stroke_id = this.stroke_id;
        //version
        return stroke;
    }

    ,to_local : function() {
        RectableStroke.to_local.call(this);
        this.width *= UI.viewpoint.scale;
        return this;
    }

    ,to_global : function() {
        RectableStroke.to_global.call(this);
        this.width /= UI.viewpoint.scale;
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
            Point.from_json(json.p[0]),
            Point.from_json(json.p[1]),
            json.c,
            json.w
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

    ,is_drawable : function() {
        return false;
    }

    ,draw : function(){}

    ,flip_strokes : function(strokes, eraser_id, finalize=false) { // ###
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
        for(let commit_id in BOARD.strokes) { // TODO: reduce search, look for linked strokes only
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
    super :  RectableStroke

    ,ImageStroke : function(image, p0, p1) {
        RectableStroke.__init__.call(this, p0, p1, 0);
        this.image = image;
    }

    ,draw : function(ctx, gr) {
        if (!RectableStroke.draw.call(this, gr))
            return false;

        let lp0 = UI.global_to_local(this.p0);
        let lp1 = UI.global_to_local(this.p1);
        ctx.drawImage(this.image
            ,lp0.x
            ,lp0.y
            ,lp1.x - lp0.x
            ,lp1.y - lp0.y
        );
        UI._canvas_changed();
        return true;
    }

    ,touched_by : function(gp, diameter=0, by_borders=true) {
        if (by_borders) {
            let box = [
                this.p0, Point.new(this.p0.x, this.p1.y),
                this.p1, Point.new(this.p1.x, this.p0.y)];
            return box.map((p, i)=>{
                let dst = gp.dst2seg(p, box[(i+1)%4]);
                return dst < diameter / 2.0;
            }).reduce((s, v)=>{return s||v;}, false);
        } else {
            return RectableStroke.touched_by.apply(this, [gp, diameter]);
        }
    }

    ,selection : function(rect) {
        if (this.is_hidden())
            return [];

        let W = BRUSH.get_local_width();

        // "all" selected
        let selected = (rect===undefined);

        // "point" picked
        selected = selected || ((this.touched_by(rect[0], 0, false)) && (rect[0].dst2(rect[1]) < W));

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
            return RectableStroke.selection.call(this);
        } else {
            return [];
        }

    }

    ,copy : function() {
        let stroke = ImageStroke.new(this.image, this.p0.copy(), this.p1.copy());
        stroke.commit_id = this.commit_id;
        stroke.stroke_id = this.stroke_id;
        //version
        return stroke;
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

export {Stroke, RectableStroke, LineStroke, ErasureStroke, ImageStroke};
