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

let BST = {

    BST : function(key_mapper) {
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
        let p = this.position(v);
        this.a.splice(p, 0, v);
        this.o.splice(p, 0, o);
        return p;
    }

};

BST = _class('BST', BST);


export {SortedList, BST};

