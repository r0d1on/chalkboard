'use strict';

import {_class} from '../base/objects.js';


let SortedList = {

    SortedList : function(key_mapper) {
        this.key_mapper = key_mapper;
        this.a = [];
        this.o = [];
    }

    ,position : function(v, l, r) {
        l = (l===undefined) ? 0 : l;
        r = (r===undefined) ? this.a.length : r;
        if (l >= r)
            return (this.a[l] < v) ? l + 1 : l;

        let c = (l + r) >> 1;
        let cv = this.a[c];

        if (v < cv) {
            return this.position(v, l, c - 1);
        } else if (v == cv) {
            return c;
        } else {
            return this.position(v, c + 1, r);
        }
    }

    ,add : function(o) {
        let v = this.key_mapper(o);

        if (!Array.isArray(v))
            v = [v];

        const p = v.map((_v)=>{
            const _p = this.position(_v);
            // if (!Number.isFinite(_v)) debugger;
            this.a.splice(_p, 0, _v);
            this.o.splice(_p, 0, o);
            return _p;
        });

        return p;
    }

    ,remove : function(o) {
        let v = this.key_mapper(o);

        if (!Array.isArray(v))
            v = [v];

        const p = v.map((_v)=>{
            let _p = this.position(_v);
            while (this.a[_p] == _v) _p -= 1;
            _p += 1;

            while (this.a[_p] == _v) {
                if (this.o[_p] == o) {
                    this.a.splice(_p, 1);
                    this.o.splice(_p, 1);
                } else {
                    _p += 1;
                }
            }
            return _p;
        });

        return p;
    }

    ,all_le : function*(_v) {
        let _p = this.position(_v);
        while (this.a[_p] == _v) _p += 1;
        _p -= 1;
        if (this.a[_p] > _v) _p -= 1;
        while (_p >= 0)
            yield this.o[_p--];
    }

    ,all_ge : function*(_v) {
        let _p = this.position(_v);
        while (this.a[_p] == _v) _p -= 1;
        _p += 1;
        if (this.a[_p] < _v) _p += 1;
        const l = this.o.length;
        while (_p < l)
            yield this.o[_p++];
    }

    ,all : function*() {
        const l = this.o.length;
        let _p = 0;
        while (_p < l)
            yield this.o[_p++];
    }


};
SortedList = _class('SortedList', SortedList);

let IndexGrid = {

    IndexGrid : function(rect, step, parent) {
        this.rect = rect;
        this.step = step;
        this.parent = parent;

        let cx = Math.ceil((rect[1].x - rect[0].x) / step);
        let cy = Math.ceil((rect[1].y - rect[0].y) / step);

        this.a = Array(cy);
        for(let i=0; i<cy; i++)
            this.a[i] = Array(cx).fill(0).map(()=>{return {};});

        this.s = {};
    }

    ,extend : function(rect) {
        if (this.parent!=null) {
            throw('attempt to extend subordinate IndexGrid cell');
        }

        let dy_l = 0;
        while (rect[0].y <= this.rect[0].y) {
            this.rect[0].y -= this.step;
            dy_l += 1;
        }

        let dy_r = 0;
        while (rect[1].y >= this.rect[1].y) {
            this.rect[1].y += this.step;
            dy_r += 1;
        }

        let dx_l = 0;
        while (rect[0].x <= this.rect[0].x) {
            this.rect[0].x -= this.step;
            dx_l += 1;
        }

        let dx_r = 0;
        while (rect[1].x >= this.rect[1].x) {
            this.rect[1].x += this.step;
            dx_r += 1;
        }

        let cy = this.a.length;
        let cx = this.a[0].length;

        for(let i=0; i<dy_r; i++)
            this.a.splice(cy, 0, Array(cx).fill(0).map(()=>{return {};}));

        for(let i=0; i<dy_l; i++)
            this.a.splice(0, 0, Array(cx).fill(0).map(()=>{return {};}));

        if (dx_l + dx_r > 0) {
            for(let i=0; i < (cy + dy_l + dy_r); i++) {
                for(let j=0; j<dx_r; j++)
                    this.a[i].splice(cx, 0, {});
                for(let j=0; j<dx_l; j++)
                    this.a[i].splice(0, 0, {});
            }
        }

        if (dy_l + dx_l > 0) {
            for(const sid in this.s) {
                let cells = this.s[sid];
                let ncells = cells.length;
                for(let i=0; i<ncells; i++) {
                    cells[i][0] = cells[i][0] + dy_l;
                    cells[i][1] = cells[i][1] + dx_l;
                }
            }
        }
    }

    ,rect_coords : function(r0) {
        let i0 = Math.floor((r0[0].y - this.rect[0].y) / this.step);
        let j0 = Math.floor((r0[0].x - this.rect[0].x) / this.step);

        let i1 = Math.floor((r0[1].y - this.rect[0].y) / this.step);
        let j1 = Math.floor((r0[1].x - this.rect[0].x) / this.step);
        return [[i0, j0], [i1, j1]];
    }

    ,get_strokes_in : function*(rect) {
        let [[i0, j0], [i1, j1]] =  this.rect_coords(rect);
        i0 = Math.max(i0, 0);
        j0 = Math.max(j0, 0);
        i1 = Math.min(i1, this.a.length - 1);
        j1 = Math.min(j1, this.a[0].length - 1);

        let was = {};
        for(let i=i0; i<=i1; i++)
            for(let j=j0; j<=j1; j++) {
                let a = this.a[i][j];
                for(let stroke_id in a)
                    if (stroke_id in was)
                        continue;
                    else {
                        yield a[stroke_id];
                        was[stroke_id] = true;
                    }
            }
    }

    ,add_stroke : function(stroke) {
        if (!stroke.is_drawable())
            return;
        this.extend(stroke.rect());

        const sid = stroke.stroke_id;
        const cell_gen = stroke.visible_cells(this);

        for(let ij of cell_gen) {
            this.a[ij[0]][ij[1]][sid] = stroke;

            let stroke_cells = this.s[sid];
            if (stroke_cells === undefined) {
                stroke_cells = [];
                this.s[sid] = stroke_cells;
            }
            stroke_cells.push(ij);
        }
    }

    ,remove_stroke : function(stroke) {
        const sid = stroke.stroke_id;

        if (!(sid in this.s)) return;

        this.s[sid].map((ij)=>{
            let a = this.a[ij[0]];
            a = a[ij[1]];
            delete a[sid];
        });

        delete this.s[sid];
    }

    ,all_strokes : function*() {
        let was = {};
        for(let i=0; i < this.a.length; i++)
            for(let j=0; j < this.a[0].length; j++) {
                let a = this.a[i][j];
                for(let stroke_id in a)
                    if (stroke_id in was)
                        continue;
                    else {
                        yield [i,j,a[stroke_id]];
                        was[stroke_id] = true;
                    }
            }
    }

};
IndexGrid = _class('IndexGrid', IndexGrid);


export {SortedList, IndexGrid};

