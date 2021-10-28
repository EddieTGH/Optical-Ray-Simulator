
/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: the mathematical internals behind the project
*/

let canvas = document.getElementById("optics-canvas");
let ctx = canvas.getContext("2d");
let mouse_down = false;
let tooltip_up = false;
let scale = 20;
let offset = [-6, -6];
let start_coords;

/*
Document coords = dcoords
Canvas coords = ccoords
Optical coords = ocoords
*/

function initCanvas() {
    resizeCanvas();
    setInterval(renderCanvas, 50);
}

function renderCanvas() {
    if (do_render) {
        do_render = false;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // get canvas in optical coords
        const bl = convertCoords([0, ctx.canvas.height], "c_o");
        const tr = convertCoords([ctx.canvas.width, 0], "c_o");
        const x_range = [bl[0], tr[0]];
        const y_range = [bl[1], tr[1]];

        for (id in curves) {
            //console.log(`${id}\t${Date.now()}\tSTART`);
            let blines = renderCurve(curves[id], x_range, y_range);
            //console.log(`${id}\t${Date.now()}\tMID`);
            for (const bline of blines) {
                renderBLine(convertCoordList(bline), curves[id].color);
            }
            //console.log(`${id}\t${Date.now()}\tEND`);
        }

        for (id in light_rays) {
            let bline = convertCoordList(light_rays[id].getPoints());
            renderBLine(bline, light_rays[id].color);

            // handle no-intersection case
            if (light_rays[id].head != null) {
                const head = light_rays[id].head;
                const lead = light_rays[id].points[light_rays[id].points.length - 1];

                const x_inter = (y_range[sgn2(head[1])] - lead[1]) * (head[0] / head[1]) + lead[0];
                if (x_range[0] <= x_inter && x_inter <= x_range[1]) {
                    renderBLine(convertCoordList([lead, [x_inter, y_range[sgn2(head[1])]]]), light_rays[id].color);
                    continue;
                }

                const y_inter = (x_range[sgn2(head[0])] - lead[0]) * (head[1] / head[0]) + lead[1];
                if (y_range[0] <= y_inter && y_inter <= y_range[1]) {
                    renderBLine(convertCoordList([lead, [x_range[sgn2(head[0])], y_inter]]), light_rays[id].color);
                    continue;
                }
            }
        }
    }
}

// renders a curve object, returns broken lines
// Takes in curve, and canvas x and y ranges
function renderCurve(c, xr, yr) {
    let t_ranges = [];
    let state = false;

    if (inRect(c.bline[0].pt, xr, yr)) {
        t_ranges.push([0]);
        state = true;
    }
    for (let i = 1; i < c.bline.length; i++) {
        const pt = c.bline[i].pt;
        const t = c.bline[i].t;

        if (state == false) {
            if (inRect(pt, xr, yr)) {
                t_ranges.push([c.bline[i-1].t]);
                state = true;
            } else if (rectsIntersect(c.bline[i-1].pt, pt, xr, yr)) {
                t_ranges.push([c.bline[i-1].t, t]);
            }
        } else if (state == true) {
            if (!inRect(pt, xr, yr)) {
                t_ranges[t_ranges.length - 1].push(t);
                state = false;
            }
        }
    }
    if (state == true) {
        t_ranges[t_ranges.length - 1].push(1);
    }

    let blines = [];
    for (const t_range of t_ranges) {
        let bline = [];
        //console.log(`t_range=${t_range}`);
        let t = t_range[0];

        while (t < t_range[1]) {
            bline.push(c.calc(t));
            //let delta = Math.max(Math.abs(...c.diff(t)));
            let delta = vectMag(c.diff(t));
            let kappa = sigmoid(c.rcurve(t));
            let k = 5;
            //let dt = Math.min(Math.max(1 / (delta * scale), 0.001), 0.05);
            let dt = Math.min(Math.max(k * kappa / (delta * scale), 0.001), 0.05);
            t += isNaN(dt) ? 0.001 : dt;
        }
        bline.push(c.calc(t_range[1]));
        //console.log(`bline_len${bline.length}`);
        blines.push(bline);
    }

    return blines;
}

function renderBLine(bline, color) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, 
        ${color[2]}, ${color[3]})`;
    for (let i = 1; i < bline.length; i++) {
        ctx.moveTo(bline[i-1][0],  bline[i-1][1]);
        ctx.lineTo(bline[i][0], bline[i][1]);
        ctx.stroke();
    }
}

function resizeCanvas() {
    // Store old size
    const old_csize = [ctx.canvas.width, ctx.canvas.height];
    
    // Get new size
    const c_size = document.getElementById("c-resize").getBoundingClientRect();
    const new_csize = [Math.max(300, c_size.width),
                        Math.max(Math.min(c_size.height, 0.9*window.innerHeight), 300)];

    // Update size
    ctx.canvas.width = new_csize[0];
    ctx.canvas.height = new_csize[1];

    // Update offset so that center stays in center
    offset[0] += (old_csize[0] - new_csize[0]) / (2 * scale);
    offset[1] += (old_csize[1] - new_csize[1]) / (2 * scale);

    do_render = true;
}

// this function if ugly and horrible and should be betterified
function zoomCanvas(event) {
    if (isInCanvas(event.x, event.y)) {
        // Get old properties
        var event_ocoords = convertCoords([event.x, event.y]);
        const old_scale = scale;

        // Change scale
        //scale += -event.deltaY * 0.05;
        scale *= (1 - 0.0005*event.deltaY);
        scale = Math.max(Math.min(scale, 100000), 0.001);

        // Update offset so that mouse is at same pos
        offset[0] = event_ocoords[0] - (old_scale / scale) * (event_ocoords[0] - offset[0]);
        offset[1] = event_ocoords[1] - (old_scale / scale) * (event_ocoords[1] - offset[1]);
        
        do_render = true;
    }
}

function panCanvas(event) {
    offset[0] -= (event.x - start_coords[0])/scale;
    offset[1] += (event.y - start_coords[1])/scale;

    start_coords = [event.x, event.y];
    do_render = true;
}

function mousedownCanvas(event) {
    if (isInCanvas(event.x, event.y)) {
        mouse_down = true;
        start_coords = [event.x, event.y];
    }
}

function mousemoveCanvas(event) {
    if (mouse_down) { panCanvas(event); }
}

function mouseupCanvas(event) {
    mouse_down = false;
}

function isInCanvas(x, y) {         // Takes document coords
    const c_size = canvas.getBoundingClientRect();
    if (x < c_size.left || x > c_size.right) {
        return false;
    }
    if (y < c_size.top || y > c_size.bottom) {
        return false;
    }
    return true;
}

function convertCoords(coords, mode="d_o") {    
    const c_size = canvas.getBoundingClientRect();

    if (mode == "d_o") {
        // Convert to canvas coords
        coords[0] -= c_size.left;
        coords[1] -= c_size.top;
        
        // Convert to otree coords
        coords[0] = coords[0]/scale + offset[0];
        coords[1] = (c_size.height - coords[1])/scale + offset[1];
    } else if (mode == "o_c") {
        coords[0] = scale * (coords[0] - offset[0]);
        coords[1] = c_size.height - scale * (coords[1] - offset[1]);
    } else if (mode == "c_o") {
        // Convert to otree coords
        coords[0] = coords[0]/scale + offset[0];
        coords[1] = (c_size.height - coords[1])/scale + offset[1];
    }

    return coords;
}

function convertCoordList(list, mode="o_c") {
    return list.map(coords => convertCoords([...coords], mode));
}

// EVENT LISTENERS
window.addEventListener("resize", resizeCanvas);
document.onwheel = zoomCanvas;
document.onmousedown = mousedownCanvas;
document.onmousemove = mousemoveCanvas;
document.onmouseup = mouseupCanvas;

initCanvas();