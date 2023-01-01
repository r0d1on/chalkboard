'use strict';

import {_class, has} from '../base/objects.js';

let Point = {

    Point : function(x, y, d, p, pressure) {
        this.x = x;
        this.y = y;
        if (d!==undefined)
            this.d = d;
        if (p!==undefined)
            this.p = p;
        if (pressure!==undefined)
            this.pressure = pressure;
    }

    ,dst2 : function(other) {
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        return dx*dx + dy*dy;
    }

    ,dst : function(other) {
        return Math.sqrt(this.dst2(other));
    }

    ,dst2seg2 : function(a, b) {
        const len2 = a.dst2(b);
        if (len2 == 0)
            return this.dst2(a);

        let t = ((this.x - a.x) * (b.x - a.x) + (this.y - a.y) * (b.y - a.y));
        t = t / len2;
        t = Math.max(0, Math.min(1, t));

        return this.dst2(Point.new(
            a.x + t * (b.x - a.x),
            a.y + t * (b.y - a.y)
        ));
    }

    ,dst2seg : function(a, b) {
        return Math.sqrt(this.dst2seg2(a, b));
    }

    ,add : function(other, scale) {
        scale = (scale===undefined)?1:scale;
        return this.sub(other, -scale);
    }

    ,sub : function(other, scale) {
        scale = (scale===undefined)?1:scale;
        return Point.new(this.x - other.x * scale, this.y - other.y * scale);
    }

    ,mul : function(scale) {
        return Point.new(this.x * scale, this.y * scale);
    }

    ,prod : function(other) {
        return this.x * other.y - this.y * other.x;
    }

    ,angle : function(other) {
        let t = ( this.x * this.x + this.y * this.y ) * ( other.x * other.x + other.y * other.y );
        return ( ( this.x * other.x + this.y * other.y ) / ( Math.sqrt( t ) ) ) || 0;
    }

    ,rotate : function(phi) {
        return Point.new(
            this.x * Math.cos(phi) - this.y * Math.sin(phi)
            ,this.x * Math.sin(phi) + this.y * Math.cos(phi)
        );
    }

    ,copy : function() {
        return Point.new(this.x, this.y, this.d, this.p, this.pressure);
    }

    ,to_json : function() {
        return {
            x : this.x
            ,y : this.y
        };
    }

    ,from_json : function(json) {
        return Point.new(json.x, json.y);
    }

    ,str : function() {
        let ret = [];
        for(const k in this) {
            if ((has(this, k))&&(!k.startsWith('__'))&&(this[k]!==undefined))
                ret.push(k + ':' + this[k]);
        }
        return '<' + ret.join(' , ') + '>';
    }
};

Point = _class('Point', Point);

export {Point};
