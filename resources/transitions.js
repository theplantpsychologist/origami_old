/*
Things to do
 - fix normalization so the end creases will extend to border
 - fix normalization so vertically tall cps won't get clipped
 - fix so the a2 will click together if it's close enough, otherwise will separate. but b0 and a1 are correct
 - redesign cps (and canvas) to allow for non-square cps, better fit the construction


*/
function start(){
    const theta = JSON.parse(theta.value)
    const a = JSON.parse(a.value)
    const b = JSON.parse(b.value)
}

function normalize(cp){
    `
    Map the minimum and maximum x to 0 and 1. Center y at 0.5
    Mutates cp.
    `
    var minx = 0
    var miny = 0
    var maxx = 0
    var maxy = 0
    for(const vertex of cp.vertices){
        minx = Math.min(minx,vertex.x)
        maxx = Math.max(maxx,vertex.x)
        miny = Math.min(miny,vertex.y)
        maxy = Math.max(maxy,vertex.y)
    }
    var scale = (1-0)/(maxx-minx)
    for(const vertex of cp.vertices){
        vertex.x = 0 + (vertex.x-minx)*scale
        vertex.y = 0.5 -vertex.y*scale
    }
    return cp
}
function convertToCp(){
    `
    Convert to a cp object, the local type (not FOLD, for now).
    `
}

function simpleCase(){
    console.log("====STARTING====")
    paper.project.clear()
    const theta = parseFloat(angle.value) * (2*Math.PI)/360
    const a = JSON.parse(topInput.value).sort()
    const b = JSON.parse(bottomInput.value).sort()
    const startmv = mvInput.value
    const othermv = mvInput.value == "M"?"V":"M"
    const minlength = (a[2]-a[0])/2

    console.log(a[0],a[1],a[2],b[0], b[0] == a[0] - a[1] + a[2])
    b0 = new Vertex(a[0],a[0]-b[0]*Math.tan(theta))
    a1 = new Vertex(a[0] + (a[1]-a[0])*Math.sin(theta)**2,(a[1]-a[0])*Math.sin(theta)*Math.cos(theta))
    alpha = theta - Math.atan2(a1.x-b0.x,a1.y-b0.y)
    above = a[0]+(b[0]-a[0])*Math.tan(theta)/Math.tan(alpha)
    below = a[0] + (a[1]-a[0])*Math.sin(theta)**2 + (a[1]-a[0])*Math.sin(theta)*Math.cos(theta)/Math.tan(theta-alpha)
    console.log(above,below)

    a0 = new Vertex(a[0],0)
    a2 = new Vertex(a[2],0)
    var creases = []
    var vertices = [a0,a2,b0,a1]
    creases.push(...[
        new Crease(a0,new Vertex(a[0]-minlength,0),startmv),
        new Crease(a0,new Vertex(a0.x - minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv),
        new Crease(a0,a1,othermv),
        new Crease(a0,b0,othermv),
        new Crease(b0,a1,startmv),
        new Crease(a1,new Vertex(a1.x-minlength*Math.cos(theta),a1.y+minlength*Math.sin(theta)),startmv),
        new Crease(b0,new Vertex(b0.x-minlength*Math.cos(theta),b0.y-minlength*Math.sin(theta)),othermv),
        new Crease(b0,a2,othermv),
        new Crease(a1,a2,startmv),
        new Crease(a2,new Vertex(a[2]+minlength,0),othermv),
        new Crease(a2,new Vertex(a2.x-minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv)
    ])
    for(const crease of creases){
        for(const vertex of crease.vertices){
            if(!vertices.includes(vertex)){
                vertices.push(vertex)
            }
            if(vertex.creases == []){
                vertex.creases = [crease]
            } else{
                vertex.creases.push(crease)
            }
        }
    }

    cp = new CP(vertices,creases)
    //console.log(cp)
    normalize(cp)
    //console.log(cp)
    displaycp = displayCp(cp,10,10,490,490)
}