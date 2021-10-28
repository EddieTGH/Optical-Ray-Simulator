/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: Various utility functions used in other files
*/


// This file contains various utility functions

// Computes pythegorean distance between 2 points
// Inputs are 2-lists
function distance(p1, p2) {
    return Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);
}

// Compares the distances between two points to a reference
function compareDist(p1, p2, ref) {
    return distance(p1, ref) - distance(p2, ref);
}

// Vector transformation function:
//  express a vector in [x, y] in another vector's
//  coordinate system. u -> v
//  only works with unit vectors
//  to invert the transform pass in 
//  u' = vectTrans(u, v) and v' = [vx, -vy]
function vectTrans(u, v) {
    return vectNorm([u[0]*v[0] + u[1]*v[1],
            -u[0]*v[1] + v[0]*u[1]]);
}

// returns unit vector in same direction
function vectNorm(v) {
    const mag = vectMag(v);
    if (mag == 0) {
        return v;
    }
    return v.map(vi => vi/mag);
}

// returns magnitude of vector
function vectMag(v) {
    return Math.sqrt(v[0]**2 + v[1]**2);
}

// blame andrew for this function's name
// but seriously this operation needs a name
function leg(m, n) {
    return Math.sqrt(m**2 - n**2);
}

// Modified sign function: returns 0 for negative and
// zero inputs, returns 1 for positive inputs
function sgn2(x) {
    return Math.floor((Math.sign(x) + 1)/2);
}

// 0 for positive and 1 for neg/zero
function sgn3(x) {
    return -Math.floor((Math.sign(x) - 1)/2);
}

// Interface for nerdamer.solve() that returns vals as an array
// Input is the string equation to be solved and var to solve on
function solve(eq, param) {
    // find all zeros
    let pts = nerdamer.solve(eq, param);

    // compensate for the atrocious API
    pts = pts.toDecimal();
    pts = pts.slice(1, -1).split(",");
    return pts.map(pt => parseFloat(pt));
}

// returns an array with duplicates removed
function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

// checks if point is in a rect defined by x and y ranges
function inRect(pt, xr, yr) {
    return ( (pt[0] >= xr[0] && pt[0] <= xr[1]) && (pt[1] >= yr[0] && pt[1] <= yr[1]) ? true : false);
}

// maps a function from [a, b] to [0, 1]
function normFunc(f, param, bounds) {
    return f.sub(param, `${param} * (${bounds[1] - bounds[0]}) + ${bounds[0]}`);
}

// checks if rects intersect
// one rect given by diagonal endpoints
// other rect given by x and y range
function rectsIntersect(p1, p2, xr2, yr2) {
    // because point order not known, convert to ranges
    const xr1 = [Math.min(p1[0], p2[0]), Math.max(p1[0], p2[0])]
    const yr1 = [Math.min(p1[1], p2[1]), Math.max(p1[1], p2[1])];

    // If no overlap in x, return false
    if (xr1[0] >= xr2[1] || xr2[0] >= xr1[1]) {
        return false;
    }

    // If no overlap in y, return false
    if (yr1[0] >= yr2[1] || yr2[0] >= yr1[1]) {
        return false;
    }

    return true;
}

// Logistic map of (-inf, inf) to (-1, 1)
function sigmoid(x) {
    return (2 / (1 + Math.exp(-x))) - 1;
}

// Parses latex into a float
function latexToNum(latex) {
    return parseFloat(nerdamer.convertFromLaTeX(latex).evaluate().toDecimal());
}

// Does a ray starting at p1 with direction dir
// intersect the line segment from p1 to p2?
function raySegIntersect(pt, dir, p1, p2) {
    // Test colinnearity first
    if ((p1[0] - pt[0])/dir[0] == (p1[1] - pt[1])/dir[1]) {
        return true;
    }

    const dx = 10*Math.max(Math.abs(p1[0] - pt[0]), Math.abs(p2[0] - pt[0]));
    const qt = [(dx + pt[0])*Math.sign(dir[0]), (dir[1]/dir[0]) 
                * ((dx + pt[0])*Math.sign(dir[0]) - pt[0]) + pt[1]];

    return (ccwPoints(pt, p1, p2) != ccwPoints(qt, p1, p2)) 
            && (ccwPoints(pt, qt, p1) != ccwPoints(pt, qt, p2));
}

// Are points listed in ccw order?
function ccwPoints(A, B, C) {
    return (C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0]);
}

// Which half of a param curve does a ray intersect "first"?
function bisectIntersect(curve, t_range, pt, dir) {
    const p1 = curve.calc(t_range[0]);
    const p2 = curve.calc(t_range[1]);
    const t_mid = 0.5 * (t_range[0] + t_range[1]);
    const mid = curve.calc(t_mid);

    const inter1 = raySegIntersect(pt, dir, p1, mid);
    const inter2 = raySegIntersect(pt, dir, p2, mid);

    if (inter1 && inter2) {
        if (distance(p1, pt) < distance(p2, pt)) {
            return [t_range[0], t_mid];
        }
        return [t_mid, t_range[1]];
    } else if (inter1) {
        return [t_range[0], t_mid];
    } else if (inter2) {
        return [t_mid, t_range[1]];
    }
    return false;
}

// Given that ray & segment intersect, finds POI
// This isn't currently used anywhere
function raySegPOI(pt, dir, p1, p2) {
    const m_ray = dir[1]/dir[0];
    const m_seg = (p2[1] - p1[1]) / (p2[0] - p1[0]);
    const x_inter = (p1[1] - pt[1]) / (m_ray - m_seg) + pt[0] - p1[0];
    const y_inter = m_ray * (x_inter - pt[0]) + pt[1];
    return [x_inter, y_inter];
}

// Creates and returns a DOM element with given props
function createElement(type, root="", attributes={}, classList=[]) {
    let elem = document.createElement(type);
    for (const a in attributes) {
        elem[a] = attributes[a];
    }
    for (const c of classList) {
        elem.classList.add(c);
    }
    if (root != "") {
        root.appendChild(elem);
    }
    return elem;
}

// inetger to string of len 2
function string2(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return `${n}`;
}