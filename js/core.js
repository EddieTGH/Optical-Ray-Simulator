/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: the mathematical internals behind the project
*/

let do_render = true;       // USED FOR CANVAS RENDERING

// All of the optics & internals
curves = {};
collections = {};
light_rays = {};

class Curve {
    /*
    id is the curve's id, cid is the collection's id
    eq is a 2-list of nerdaner.js representations of parametric curves
    param is a string variable
    optics is an object with keys transmit, reflect, absorb
      vals are floats that add to 1
    pos is an [x, y] offset for the eqs
    bounds is [lower bound, upper bound] on parameter values
    color is a list of the display color, [r, g, b, a]

    NOTE that all cartesian coordinates of Curves part of Collection
      are relative to the Collection's origin.
    */
    constructor(id, cid, eq, param, optics, pos, bounds, color) {
        this.id = id;
        this.cid = cid;

        // Preprocess collection vars
        let p = pos.map(n => n);
        let b = bounds.map(n => n);
        let e = eq.map(n => n);
        // Replace special commands with esoteric unicode
        const good = ['frac', 'left', 'right', 'sqrt', 'sum', 'pi', 'sin', 'cos', 'tan', 'csc', 'cot', 'cos', 'log', 'ln', 'arcsin', 'arccos', 'arctan', 'arccsc', 'arcsec', 'arccot', 'e'];
        for (let i = 0; i < good.length; i++) {
            const u = String.fromCharCode(257 + i);
            p = p.map(n => n.replaceAll(good[i], u));
            b = b.map(n => n.replaceAll(good[i], u));
            e = e.map(n => n.replaceAll(good[i], u));
        }
        // replace vars with vals
        for (const v in collections[cid].vars) {
            p = p.map(n => n.replaceAll(v, collections[cid].vars[v]));
            b = b.map(n => n.replaceAll(v, collections[cid].vars[v]));
            e = e.map(n => n.replaceAll(v, collections[cid].vars[v]));
        }
        // unreplace special commands
        for (let i = 0; i < good.length; i++) {
            const u = String.fromCharCode(257 + i);
            p = p.map(n => n.replaceAll(u, good[i]));
            b = b.map(n => n.replaceAll(u, good[i]));
            e = e.map(n => n.replaceAll(u, good[i]));
        }

        this.pos = p.map(n => latexToNum(n));
        // Map bounds onto [0, 1]
        this.symb = e.map((f, i) => normFunc(nerdamer.convertFromLaTeX(f).add(nerdamer((this.pos[i] + 
                            collections[this.cid].pos[i]).toString())), param, b.map(n => latexToNum(n))));
        
        this.param = param;
        this.symbderiv = this.symb.map(f => nerdamer.diff(f, param));

        this.eq = this.symb.map(f => f.buildFunction());
        this.deriv = this.symbderiv.map(f => f.buildFunction());
        this.deriv2 = this.symbderiv.map(f => nerdamer.diff(f, param).buildFunction());

        this.optics = optics;
        if (optics.transmit == 1) {
            this.color = [0, 153, 255, 1];
        } else if (optics.reflect == 1) {
            this.color = [186, 156, 201, 1];
        } else {
            this.color = [0, 77, 77, 1];
        }
        // this.color = color;
        
        // breakpoint hashtable
        this.bline = [];
        this.steps = 100;
        for (let i = 0; i <= this.steps; i++) {
            this.bline.push({"pt" : this.eq.map(f => f(i/this.steps)), "t" : i/this.steps});
        }
    }

    // returns cartesian [x, y] given t
    calc(t) {
        //return this.eq.map(f => f(t));
        return this.eq.map(f => f(t));
    }
    
    // returns tangent vector [x, y] given t
    diff(t) {
        return this.deriv.map(f => f(t));
    }

    //returns second deriv vector given t
    diff2(t) {
        return this.deriv2.map(f => f(t));
    }

    // returns unit tangent vector [x, y] given t
    tan(t) {
        return vectNorm(this.diff(t));
    }

    // returns the radius of curvature at t
    rcurve(t) {
        const dt = this.diff(t);
        const d2t = this.diff2(t);
        return Math.pow((Math.pow(dt[0], 2) + Math.pow(dt[1], 2)), 1.5) 
                        / Math.abs((dt[0]*d2t[1] - dt[1]*d2t[0]));
    }

    // returns the parameter value of intersection with a LightRay
    // is an approximation that may fail to return the closest
    //   intersection for overly complicated curves.
    rayIntersect(ray) {
        const pt = ray.points[ray.points.length - 1];
        let i_min = -1;
        let d_min = Infinity;

        // Find closest intersecting segment of this.bline
        for (let i = 1; i < this.bline.length; i++) {
            if (raySegIntersect(pt, ray.head, this.bline[i-1].pt, this.bline[i].pt)) {
                const dist = Math.min(distance(pt, this.bline[i-1].pt), distance(pt, this.bline[i].pt));
                if (dist < d_min && !(dist == 0 && ray.last_curve == this.id)) {
                    i_min = i;
                    d_min = dist;
                }
            }
        }

        // Return false if no intersection
        if (i_min == -1) {
            return false;
        }

        // Bisection method, modified to take the "closest"
        //   intersecting half if both intersect.
        let t_range = [this.bline[i_min - 1].t, this.bline[i_min].t];
        for (let i = 0; i < 20; i++) {
            t_range = bisectIntersect(this, t_range, pt, ray.head);
            if (t_range == false) {
                return false;
            } 
        }

        return 0.5 * (t_range[0] + t_range[1]);
    }
}

class Collection {
    /*
    pos is an [x, y] offset for the eqs
    n is a float index of refraction
    curves is a list of curve IDs
    */
    constructor(id, pos, n, curves, vars) {
        this.id = id;
        this.pos = pos.map(n => latexToNum(n));
        this.n = latexToNum(n);
        this.curves = curves;
        this.vars = {};
        for (const v in vars) {
            this.vars[vars[v]['name'].latex()] = vars[v]['val'].latex();
        }
    }
}

class LightRay {
    /*
    start is a position vector
    head is a direction vector
    med_n is the index of refraction of the current medium
    color is a list of the display color, [r, g, b, a]
    */
    constructor(id, start, head, med_n, color) {
        this.id = id;
        this.points = [start.map(n => latexToNum(n))];
        this.head = vectNorm(head.map(n => latexToNum(n)));
        this.med_n = 1;
        this.last_curve = "";
        this.color = [255, 102, 0, 1];
    }

    // returns broken line
    getPoints() {
        return this.points;
    }

    nextIncidence2() {
        const lead = this.points[this.points.length - 1];
        let intersection = null;
        let d_min = Infinity;
        for (const id in curves) {
            const t_inter = curves[id].rayIntersect(this);
            console.log(t_inter);
            if (t_inter != false) {
                const dist = distance(lead, curves[id].calc(t_inter));
                if (dist == 0 && id != this.last_curve) {
                    return [id, t_inter];
                } else if (dist < d_min && dist != 0) {
                    intersection = [id, t_inter];
                    d_min = dist;
                }
            }
        }
        console.log(this.last_curve);
        console.log(intersection);
        return intersection;
    }

    computeRay() {
        let incidence = this.nextIncidence2();
        // handle no-intersection case:
        if (incidence == null) {
            return;
        }       
        
        // do we transmit, reflect, or absorb?
        const curve = curves[incidence[0]];
        let action, strength = 0;
        for (const prop in curve.optics) {
            if (curve.optics[prop] > strength) {
                action = prop;
                strength = curve.optics[prop];
            }
        }

        if (!(action == "reflect") && !(action == "transmit")) {
            this.points.push(curve.calc(incidence[1]));
            this.head = null;
            return;
        } else {
            // handle light ray going in a loop
            let new_pt = curve.calc(incidence[1]);
            for (let i = 1; i < this.points.length; i++) {
                if (this.points[i] == new_pt && this.points[i-1] == this.points[this.points.length-1]) {
                    return;
                }
            }

            let tan = curve.tan(incidence[1]);
            let proj = vectTrans(this.head, tan);
            let r;

            if (action == "reflect") {
                r = [proj[0], -proj[1]];
            } else {                
                // this method will not work if you have two collections with n != 1 and the
                //  point of incidence is their intersection
                //const mu = this.med_n / ((this.last_curve in curves && curves[this.last_curve].cid == curve.cid) ? 1 : collections[curve.cid].n);
                const mu = collections[curve.cid].n / this.med_n;
                if (this.last_curve in curves && curve.id in collections[curves[this.last_curve].cid].curves) {
                    mu = 1 / this.med_n;
                }
                r = [proj[0] / mu, Math.sign(proj[1]) * leg(1, proj[0] / mu)];
                this.med_n = collections[curve.cid].n;
            }

            this.head = vectNorm(vectTrans(r, [tan[0], -tan[1]]));
            this.points.push(curve.calc(incidence[1]));
            this.last_curve = incidence[0];

            this.computeRay();
        }
    }

    resetCompute() {
        if (this.points.length > 1) {
            this.head = [this.points[1][0] - this.points[0][0], this.points[1][1] - this.points[0][1]]
        }
        this.points = this.points.splice(0, 1);
        this.med_n = 1;
        this.last_curve = "";
    }
}

function updateCollection(collection, id) {
    // Create/update the collection
    collections[id] = new Collection(id, collection.pos.map(f => f.latex()), collection.n.latex(), Object.keys(collection.curves), collection.vars);

    // Deconstruct all curves of collection
    for (const c in curves) {
        if (curves[c].cid == id) {
            delete curves[c];
        }
    }

    // Reconstruct all curves of collection
    for (const c in collection.curves) {
        const curve = collection.curves[c];
        curves[c] = new Curve(c, id, curve.eq.map(f => f.latex()), curve.parameter.latex(), curve.optics, curve.pos.map(f => f.latex()), curve.bounds.map(f => f.latex()), [0, 255, 0, 1]);
    }
    
    updateRays();
}

function updateRays(ray="", id="") {
    if (ray != "") {
        let v;
        if (ray.directionType == "vector") {
            v = ray.direction.map(f => f.latex());
        } else if (ray.directionType == "rad") {
            v = [`\\cos (${ray.direction.latex()})`, `\\sin (${ray.direction.latex()})`];
        } else {
            v = [`\\cos (\\frac{\\pi}{180}${ray.direction.latex()})`, `\\sin (\\frac{\\pi}{180}${ray.direction.latex()})`];
        }
        light_rays[id] = new LightRay(id, ray.pos.map(n => n.latex()), v, 1, [255, 0, 0, 1]);
    }

    // Update ray calculations
    for (const r in light_rays) {
        light_rays[r].resetCompute();
        light_rays[r].computeRay();
    }
    do_render = true;
}

function removeCollection(id) {
    // Deconstruct all curves of collection
    for (const c in curves) {
        if (curves[c].cid == id) {
            delete curves[c];
        }
    }

    delete collections[id];
    updateRays();
}

function removeRay(id) {
    delete light_rays[id];
    do_render = true;
}