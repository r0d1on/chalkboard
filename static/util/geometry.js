'use strict';

function dst2(a, b) {
    return (a.X - b.X)*(a.X - b.X) + (a.Y - b.Y)*(a.Y - b.Y); 
}

function dst2seg2(p, a, b) {
    const len2 = dst2(a, b);
    if (len2 == 0) 
        return dst2(p, a);
    let t = ((p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y)) / len2;
    t = Math.max(0, Math.min(1, t));
    return dst2(p, { X: a.X + t * (b.X - a.X),
        Y: a.Y + t * (b.Y - a.Y) });
}

function dst2seg(p, a, b) { 
    return Math.sqrt(dst2seg2(p, a, b)); 
}

function sub(a, b) {
    return { 
        X : a.X - b.X, 
        Y : a.Y - b.Y 
    };
}

function angle(a, b) {
    let t = ( a.X * a.X + a.Y * a.Y ) * ( b.X * b.X + b.Y * b.Y );
    return ( ( a.X * b.X + a.Y * b.Y ) / ( Math.sqrt( t ) ) ) || 0;
}

function rotate(p, phi) {
    return {
        X : p.X * Math.cos(phi) - p.Y * Math.sin(phi),
        Y : p.X * Math.sin(phi) + p.Y * Math.cos(phi)
    };
}

export {dst2 , dst2seg, dst2seg2, sub, angle, rotate};
