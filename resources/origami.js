/*Origami classes and data structures

Vertex: 
- x and y coordinates on cp
- xf and yf coordinates on folded model
- list of crease objects connected to it, sorted by angle
- list of angles that the creases make, sorted
- boolean: locally flat foldable (by angles)

Crease: 
- list of two vertices
- list of two faces
- MVEA (mountain, valley, edge or auxiliary (unassigned mv))

Face:
- list of creases
- list of vertices
- list of neighboring faces
- boolean: assigned? (is there a path of mv creases back to starting face) 
- list of subfaces

Subface:
- stack that it's in
- face that it's part of
- list of neighboring subfaces (within face, and across creases)

Stack:
- list of points (like vertex, but just for stacks)
- list of lines  (like crease, but just for stacks)
- list of neighboring stacks
- list of subface objects (in order when solved)

CreasePattern: 
- list of vertices
- list of creases
- list of faces
- list of stacks
- connectivity matrix between faces
- connectivity matrix between stacks

- boolean: locally flat foldable (x ray possible?)
- boolean: globally flat foldable (no self intersection)

- functions for finding faces, stacks, x ray, layer ordering, etc are stored as methods
*/

class Vertex {
    constructor(x,y){
        this.x = x
        this.y = y
        this.creases = []
        this.angles = []
        this.xf = x; //positions in the folded figure or x ray
        this.yf = y;
        //this.angularFoldable = null;
    }
}
class Crease {
    constructor(v1,v2,mv){
        this.vertices = [v1,v2]
        this.mv = mv
        this.faces = []
    }
}

class Face {
    constructor(creases,vertices){
        this.creases = creases;
        this.vertices = vertices;
        this.neighbors = [];
        this.subfaces = []
        this.assigned = false
    }
}

class Stack{
    constructor(lines,points){
        this.subfaces = []
        this.points = points
        this.lines = lines
        this.neighbors = [] //neighboring stacks in the folded state
    }
}
class Stackpoint{
    constructor(x,y){
        this.xf = x;
        this.yf = y; //there is no cp coord
        this.lines = []
        this.angles = []
    }
    //will also have to sort by angle
    sortAngles(){
        this.angles = []
        for(const line of this.lines){
            this.angles.push(
                Math.atan2(line.points[0].yf - this.yf, line.points[0].xf - this.xf)+
                Math.atan2(line.points[1].yf - this.yf, line.points[1].xf - this.xf) 
                //one of thee crease's vertices will be this vertex, so the atan2 will return 0
            ) 
        }
        this.lines.sort((a,b)=>this.angles[this.lines.indexOf(a)]-this.angles[this.lines.indexOf(b)]) //sort lines based on angle
        this.angles.sort((a,b)=>a-b)
    }
}
class Stackline{
    constructor(v1,v2){
        this.points = [v1,v2]
        this.stacks = []
    }
}
class Subface{
    constructor(face,stack){
        this.face = face
        this.stack = stack
        this.neighbors = [] //neighbors on the cp, not folded state
    }
}
class CP {
    constructor(vertices,creases){
        this.vertices = vertices;
        this.creases = creases;
        
        
        this.stacks = []
        this.stackmatrix = []
        this.assignedFaces = []
    }
    checkFoldability(){
        this.angularFoldable = true;
        for(const vertex of this.vertices){ //this needs to be not i, bc i is used in a loop when checking a vertex
            if(!isVertexFlatFoldable(vertex)){
                this.angularFoldable = false;
            }
        }
    }
    foldXray(){
        //assign folded coordinates to vertices by reflecting each face along its bath back to the starting face
        [this.faces,this.matrix] = findFaces(this.creases)
        var startingFace = this.faces[0] //this is arbitrarily chosen
        const n = this.faces.length
        //bfs throughout the graph to give every face a distance from the starting face
        startingFace.distance = 0;
        startingFace.assigned = true
        function spread2(face){
            for(const neighbor of face.neighbors){
                if(['M','V'].includes(face.creases.find(element=>neighbor.creases.includes(element)).mv)){
                    neighbor.assigned = true
                }
                if(neighbor.distance > face.distance || neighbor.distance == undefined){
                    neighbor.distance = face.distance + 1
                }
            }
            for(const neighbor of face.neighbors){
                if(neighbor.distance == face.distance+1){
                    spread2(neighbor)
                }
            }
        }
        spread2(startingFace)

        //now for each face, calculate folded coords by reflecting along the path to starting face
        for(const face of this.faces){
            var stepsAway = face.distance;
            const index = this.faces.indexOf(face)
            for(const vertex of face.vertices){
                [vertex.xf,vertex.yf] = [vertex.x,vertex.y] //reset to unfolded position
            }
            var currentFace = face
            while(stepsAway>0){
                //
                var neighbor = currentFace.neighbors.find(element=>element.distance ==stepsAway-1)
                var reflector = currentFace.creases.find(element=>neighbor.creases.includes(element))//this.matrix[index][this.faces.indexOf(neighbor)]
                reflectFace(face,reflector)
                stepsAway = neighbor.distance
                currentFace = neighbor //in the next loop we'll reflect across the next face in the chain, but it's the original face that gets moved
            }
        }
        
        //for each face, find the path to the starting face. reset xf = x before doing anything
        //keep reflecting along the path, updating xf until you get get to the starting face
    }
    displayXray(xc,yc,scale){
        var totalCenterx = 0
        var totalCentery = 0
        for(const vertex of this.vertices){totalCenterx += vertex.xf; totalCentery += vertex.yf}
        totalCenterx = totalCenterx/this.vertices.length
        totalCentery = totalCentery/this.vertices.length

        totalCenterx = 0.5
        totalCentery = 0.5


        function convertx(cp){
            //Converting cp coords, which range from 0,1, into js coords centered at xc,yc
            //return x1+cp*(x2-x1);
            return (cp-totalCenterx)*scale+xc
        }
        function converty(cp){
            //also the y coordinates are displayed upside down
            //return y1-cp*(y1-y2);
            return(cp-totalCentery)*scale+yc
        }
        var xray = new paper.Group();
        for(i=0;i<this.faces.length;i++){
            var face = new paper.Path();
            for(j=0;j<this.faces[i].vertices.length;j++){
                face.add(new paper.Point(convertx(this.faces[i].vertices[j].xf),converty(this.faces[i].vertices[j].yf)))
            }
            face.closed = true;
            face.strokeColor = 'black'
            face.opacity = 0.1
            face.fillColor = 'black'
            face.strokeWidth = (scale)/200;
            xray.addChild(face)
            //for displaying distance from center
            /*
            var centerx = 0
            var centery = 0
            for(const vertex of this.faces[i].vertices){centerx += vertex.x; centery += vertex.y}
            centerx = centerx/this.faces[i].vertices.length
            centery = centery/this.faces[i].vertices.length
            var center = new paper.Point(
                convertx(centerx),
                converty(centery))
            var text = new paper.PointText(center)
            text.content = this.faces[i].distance
            */
        }
    }
    
}

//==================================================================
//auxiliary functions
//==================================================================

//File processing
function readCpFile(file){
    //Inputs the cp file as an array, where each item in the array is the line as a string
    //Reads the cp file for the vertices and creases
    //Returns a CP object

    //For now, we're assuming the cp is in the [-200,200] box, and will ignore all edge lines
    file = file.split('\n')
    function convert(coord){
        return (coord+200)/400;
    }
    vertices = [];
    creases = [];
    for(i=0;i<file.length;i++){
        line = file[i].split(' ')

        if(line[0]=='2'){mv='M'}
        else if(line[0]=='3'){mv='V'}
        else if(line[0]=='4'){mv='A'}
        else if(line[0]=='1'){continue;mv='E'}else{continue}
        line = line.map(parseFloat).map(convert) //parse as float and convert to [0,1] coords

        v1 = null;
        v2 = null;
        for(j=0;j<vertices.length;j++){
            if(eq(vertices[j].x,line[1]) && eq(vertices[j].y,line[2])){
                v1 = vertices[j];
            }
            if(eq(vertices[j].x,line[3]) && eq(vertices[j].y,line[4])){
                v2 = vertices[j];
            }
        }
        if(v1==null){ 
            v1 = new Vertex(line[1],line[2]);
            vertices.push(v1);
        }
        if(v2==null){ 
            v2 = new Vertex(line[3],line[4]);
            vertices.push(v2);
        }
        crease = new Crease(v1,v2,mv)

        //check if this crease already exists
        next = false
        for(const oldCreases of creases){
            if(haveSameContents(oldCreases.vertices,crease.vertices)){
                next = true;
                break
            }
        }
        if(next){continue}
        v1.creases.push(crease);
        v2.creases.push(crease);
        creases.push(crease)
    }

    //Now go back in and put the edges based on the vertices that are on the edge
    //delete once split function works, will used built in cp edge lines
    {var topEdge = []
    var rightEdge = []
    var bottomEdge = []
    var leftEdge = []
    var topLeft = false
    var topRight = false
    var bottomLeft = false
    var bottomRight = false
    for(i = 0; i<vertices.length; i++){
        if(eq(vertices[i].x,0)){leftEdge.push(vertices[i])}
        if(eq(vertices[i].y,0)){bottomEdge.push(vertices[i])}
        if(eq(vertices[i].x,1)){rightEdge.push(vertices[i])}
        if(eq(vertices[i].y,1)){topEdge.push(vertices[i])}

        if(eq(vertices[i].x,0) && eq(vertices[i].y,0)){bottomLeft = true}
        if(eq(vertices[i].x,1) && eq(vertices[i].y,1)){topRight = true}
        if(eq(vertices[i].x,0) && eq(vertices[i].y,1)){topLeft = true}
        if(eq(vertices[i].x,1) && eq(vertices[i].y,0)){bottomRight = true}
    }
    if(!topLeft){cornerPoint = new Vertex(0,1); vertices.push(cornerPoint); topEdge.push(cornerPoint);leftEdge.push(cornerPoint)}
    if(!topRight){cornerPoint = new Vertex(1,1); vertices.push(cornerPoint); topEdge.push(cornerPoint);rightEdge.push(cornerPoint)}
    if(!bottomRight){cornerPoint = new Vertex(1,0); vertices.push(cornerPoint); bottomEdge.push(cornerPoint);rightEdge.push(cornerPoint)}
    if(!bottomLeft){cornerPoint = new Vertex(0,0); vertices.push(cornerPoint); bottomEdge.push(cornerPoint);leftEdge.push(cornerPoint)}

    edges = [topEdge.sort((a,b)=>(a.x- b.x)),rightEdge.sort((a,b)=>(a.y- b.y)),bottomEdge.sort((a,b)=>(a.x- b.x)),leftEdge.sort((a,b)=>(a.y- b.y))]
    for(j=0;j<4;j++){
        for(i = 0;i<edges[j].length-1;i++){
            edgeCrease = new Crease(edges[j][i],edges[j][i+1],'E');
            creases.push(edgeCrease)
            edges[j][i].creases.push(edgeCrease)
            edges[j][i+1].creases.push(edgeCrease)
        }
    }}
    return new CP(vertices,creases)
}
function readFoldFile(file){
    var cpobject = JSON.parse(file) //the input is split by line oops 
    function convert(coord){
        if(cpobject["file_creator"]=="flat-folder"){return} //flat folder also uses [0,1]
        if(cpobject["file_creator"]=="oriedita")return (coord+200)/400; //oriedita uses [-200,200]
        else return
    }
    var vertices = []
    var creases = []
    for(const coord of cpobject["vertices_coords"]){
        vertices.push(new Vertex(convert(coord[0]),convert(coord[1])))
    }
    cpobject["edges_vertices"].forEach(
        (crease,index)=>creases.push(new Crease(vertices[crease[0]],vertices[crease[1]],
            cpobject["edges_assignment"][index]=="B"?"E":
            cpobject["edges_assignment"][index]=="U"?"A":
            cpobject["edges_assignment"][index]
        ))
    )
    for(const crease of creases){
        for(const vertex of crease.vertices){
            vertex.creases.push(crease)
        }
    }
    return new CP(vertices,creases)
}
function downloadCP(cp) {
    //https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
    function convertx(x){
        return x*400 - 200
    }
    function converty(y){
        return y*400 - 200
    }
    contents = ''
    for(const crease of cp.creases){
        var newline = ''
        if(crease.mv == 'E'){newline += '1 '}
        else if(crease.mv == 'M'){newline += '2 '}
        else if(crease.mv == 'V'){newline += '3 '}
        else{newline += '4 '}
        newline += convertx(crease.vertices[0].x).toString() + ' ' + converty(crease.vertices[0].y).toString() + ' '
        newline += convertx(crease.vertices[1].x).toString() + ' ' + converty(crease.vertices[1].y).toString()
        contents += newline + '\n'
    }


    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
    element.setAttribute('download', 'output.cp');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function split(creases,vertices){
    //takes in a list of creases and vertices
    /*need to fix things like:
        - two creases cross,crossed vertex isn't represented
        - crease starts/ends on another crease
     coincident creases and vertices should be taken care of when graph is created by checking for duplicates
    */
    for(i = 0; i<creases.length-1; i++){
        for(j=i+1;j<creases.length;j++){
            //if([creases[1].vertices])
            var intersection = linesIntersection(...creases[i].vertices,...creases[j].vertices)
            if(intersection){
                p = new Vertex(...intersection)
                vertices.push(p)
                //if p is coincident with an endpoint, delete the endpoint and set p as the new endpoint
                //if p is not coincident with an endpoint, delete crease and replace with 2
                for(const crease of [creases[i],creases[j]]){
                    if(intersection.x == crease.vertices[0].x & intersection.y == crease.vertices[0].y){
                        delete(vertices[vertices.indexOf(crease.vertices[0])]) // delete, not splice, so the indices don't change
                        crease.vertices.splice(0,1) //splice bc the order doesn't matter
                        crease.vertices.push(p)
                        continue
                    }
                    else if(intersection.x == crease.vertices[1].x & intersection.y == crease.vertices[1].y){
                        delete(vertices[vertices.indexOf(crease.vertices[1])]) // delete, not splice, so the indices don't change
                        crease.vertices.splice(1,1) //splice bc the order doesn't matter
                        crease.vertices.push(p)
                        continue
                    }
                    else{
                        v1 = crease.vertices[0]
                        v2 = crease.vertices[1]
                        v1.creases.splice(v1.creases.indexOf(crease),1)
                        v2.creases.splice(v2.creases.indexOf(crease),1) //the creases have not been ordered yet
                        delete(creases[creases.indexOf(crease)]) //this is important because we are iterating through the creases
                        newCrease1 = new Crease(v1,p)
                        newCrease2 = new Crease(p,v2)
                        creases.push(newCrease1,newCrease2)
                        v1.creases.push(newCrease1)
                        v2.creases.push(newCrease2)
                    }
                }
            }
        }
    }
    creases.filter(Boolean) //remove the null elements
    vertices.filter(Boolean)
    return[creases,vertices]
    //when this is done, fix the read cp function
}
function displayCp(CP,x1,y1,x2,y2){ //so you can position where to draw it
    function convertx(cp){
        //Converting cp coords, which range from 0,1, into js coords which range from x1,x2 and y1,y2
        return x1+cp*(x2-x1);
    }
    function converty(cp){
        //also the y coordinates are displayed upside down
        return y1-cp*(y1-y2);
    }
    //var border = new paper.Path.Rectangle(x1,y1,x2-x1,y2-y1);
    //border.strokeColor = 'black';
    //border.strokeWidth = (x2-x1)/100;

    var creaselines = new paper.Group();
    for(i=0;i<CP.creases.length;i++){
        line = new paper.Path.Line(
            new paper.Point(convertx(CP.creases[i].vertices[0].x),converty(CP.creases[i].vertices[0].y)),
            new paper.Point(convertx(CP.creases[i].vertices[1].x),converty(CP.creases[i].vertices[1].y))
        )
        line.strokeColor = CP.creases[i].mv=='M'?"#EB5160" : CP.creases[i].mv=='V'?"#33A1FD" : CP.creases[i].mv=='A'?"#0DE4B3":'black'
        creaselines.addChild(line);
    }
    creaselines.strokeWidth = (x2-x1)/200;

    var errorcircles = new paper.Group();
    for(i=0;i<CP.vertices.length;i++){
        if(!CP.vertices[i].angularFoldable){
            var circle = new paper.Path.Circle({
                center: new paper.Point(convertx(CP.vertices[i].x),converty(CP.vertices[i].y)),
                radius: (x2-x1)/30,
                opacity: 0.3,
                fillColor: 'purple'
            })
            errorcircles.addChild(circle);
        }
    }
    var cp = new paper.Group()
    cp.addChild(creaselines)
    cp.addChild(errorcircles)
    return cp
}
function convertFOLD(cp) {
    var vertices_coords = []
    var edges_vertices = []
    var edges_assignment = []
    var faces_vertices = []
    for(const face of cp.assignedfaces){
        var facevertices = []
        for(const vertex of face.vertices){
            var index = vertices_coords.findIndex(item => item[0]==vertex.x & item[1]==vertex.y)
            if(index == -1){index = vertices_coords.length; vertices_coords.push([vertex.x,vertex.y])}
            facevertices.push(index)
        }
        for(const crease of face.creases){
            var index1 = vertices_coords.findIndex(item => item[0]==crease.vertices[0].x & item[1]==crease.vertices[0].y)
            var index2 = vertices_coords.findIndex(item => item[0]==crease.vertices[1].x & item[1]==crease.vertices[1].y)
            if(edges_vertices.findIndex(item =>haveSameContents(item,[index1,index2]))== -1){
                if(crease.mv == 'A' | crease.mv == 'E'){edges_assignment.push("B")}
                else{edges_assignment.push(crease.mv)}
                edges_vertices.push([index1,index2])
            }
        }
        faces_vertices.push(facevertices)
    }
    var cpobject = {
        "vertices_coords":vertices_coords,
        "edges_vertices": edges_vertices,
        "edges_assignment": edges_assignment,
        "faces_vertices":faces_vertices
    }
    return cpobject
}
function downloadFOLD(cp){
    var vertices_coords = []
    var edges_vertices = []
    var edges_assignment = []
    var faces_vertices = []
    for(const face of cp.faces){
        var facevertices = []
        for(const vertex of face.vertices){
            var index = vertices_coords.findIndex(item => item[0]==vertex.x & item[1]==vertex.y)
            if(index == -1){index = vertices_coords.length; vertices_coords.push([vertex.x,vertex.y])}
            facevertices.push(index)
        }
        for(const crease of face.creases){
            var index1 = vertices_coords.findIndex(item => item[0]==crease.vertices[0].x & item[1]==crease.vertices[0].y)
            var index2 = vertices_coords.findIndex(item => item[0]==crease.vertices[1].x & item[1]==crease.vertices[1].y)
            if(edges_vertices.findIndex(item =>haveSameContents(item,[index1,index2]))== -1){
                if(crease.mv == 'E'){edges_assignment.push("B")}
                if(crease.mv == 'A'){edges_assignment.push("U")}
                else{edges_assignment.push(crease.mv)}
                edges_vertices.push([index1,index2])
            }
        }
        faces_vertices.push(facevertices)
    }
    var cpobject = {
        "vertices_coords":vertices_coords,
        "edges_vertices": edges_vertices,
        "edges_assignment": edges_assignment,
        "faces_vertices":faces_vertices
    }
    cpobject['vertices_coords'].forEach((element) => element = [element[0]*400 - 200, element[1]*400 - 200])
    contents = JSON.stringify(cpobject)
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
    element.setAttribute('download', 'output.fold');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

//basic operations
function eq(a,b){
    if(Math.abs(a-b)>10**(-10)){return false} else {return true}
}
function dot(v1,v2){
    return v1[0]*v2[0] + v1[1]*v2[1]
}
function haveSameContents(arr1,arr2){
    for(const item of arr1){
        if(!arr2.includes(item)){return false}
    }
    for(const item of arr2){
        if(!arr1.includes(item)){return false}
    }
    return true
}
function haveCommonElement(arr1,arr2){
    //returns a list of ordered pairs, where the first in the pair is the index of first array and second is index of second array
    var indices = []
    arr1.forEach((element,index) => arr2.includes(element)?indices.push([index,arr2.indexOf(element)]):null)
    return indices
}


//geometric operations
function reflectPoint(v1,v2,v3){
    var v = [v3.x-v2.x , v3.y-v2.y]
    var u = [v1.xf-v2.x , v1.yf-v2.y]
    var p = [v2.x+v[0]*(u[1]*v[1] + u[0]*v[0])/(v[1]**2+v[0]**2), v2.y+v[1]*(u[1]*v[1] + u[0]*v[0])/(v[1]**2+v[0]**2)]
    var v4 = [v1.xf+2*(p[0]-v1.xf) , v1.yf+2*(p[1]-v1.yf)]
    return v4
}
function reflectFace(moving,reflector){
    //moving: face that is moving
    //reflector: the crease between the two faces
    for(const vertex of moving.vertices){
        [vertex.xf,vertex.yf] = reflectPoint(vertex,reflector.vertices[0],reflector.vertices[1])
    }
}
function isFaceClockwise(vertices){
    //https://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-points-are-in-clockwise-order
    if(vertices[0].constructor.name == 'Vertex'){
        sum = 0
        for(a = 0;a<vertices.length; a++){
            var [x1,y1] = [vertices[a].x,vertices[a].y]
            if(a==vertices.length-1){
                var [x2,y2] = [vertices[0].x,vertices[0].y]
            } else{
                var [x2,y2] = [vertices[a+1].x,vertices[a+1].y]
            }
            sum += (x2 - x1)*(y2 + y1)
        }
        if(sum>0){return true} else{return false}
    }

    if(vertices[0].constructor.name == 'Stackpoint'){
        sum = 0
        for(a = 0;a<vertices.length; a++){
            var [x1,y1] = [vertices[a].xf,vertices[a].yf]
            if(a==vertices.length-1){
                var [x2,y2] = [vertices[0].xf,vertices[0].yf]
            } else{
                var [x2,y2] = [vertices[a+1].xf,vertices[a+1].yf]
            }
            sum += (x2 - x1)*(y2 + y1)
        }
        if(sum>0){return true} else{return false}
    }
}
function findFaces(creases){
    //generic algorithm for finding faces of a graph.
    //used for face finding on cp, and stack finding
    //"crease" just means an edge of a graph. contains two vertices, which contain creases in angular order
    //also important to set the connectivity stuff here. creases to faces -> faces to each other

    //create the faces
    var faces = []
    for(const crease of creases){
        //Find the two faces on either side of the crease
        //Keep turning right until you come back to this crease. See if this face is already found or not.
        //Do this for both directions.
        for(const endPoint of crease.vertices){
            var creaseGroup = []
            var vertexGroup = []; 
            var currentCrease;
            var currentVertex;
            var nextCrease;

            currentCrease = crease;
            currentVertex = endPoint;
            while(nextCrease!=crease){
                nextCrease = currentVertex.creases[currentVertex.creases.indexOf(currentCrease) + 1]
                if(nextCrease == undefined){nextCrease = currentVertex.creases[0]}//loop around if you were at the end of the list
                creaseGroup.push(nextCrease)
                vertexGroup.push(currentVertex)
                currentCrease = nextCrease
                if(currentCrease.vertices[0]==currentVertex){currentVertex = currentCrease.vertices[1]} else {currentVertex = currentCrease.vertices[0]}
                if(crease.vertices.includes(currentVertex)){
                    creaseGroup.push(crease);
                    vertexGroup.push(currentVertex);
                    break
                }
            }
            if(creaseGroup.length<3){continue}
            if(!isFaceClockwise(vertexGroup)){continue} //otherwise its the ones that run around the outside
            var isNew = true;
            
            for(const oldface of faces){
                if(haveSameContents(oldface.vertices,vertexGroup)){
                    //crease.faces.push(oldface)
                    var isNew = false;
                }
            }
            if(isNew){
                var newFace = new Face(creaseGroup,vertexGroup)
                faces.push(newFace);
                //crease.faces.push(newFace);
            }
        }
    }

    //tell creases which faces belong to them
    for(const face of faces){
        for(const crease of face.creases){
            crease.faces.push(face)
        }
    }
    //now we make the connectivity matrix
    const n = faces.length
    matrix = []
    for(i=0;i<n;i++){
        matrix.push(Array.apply(null, Array(n))) //make an empty nxn matrix
    }
    
    for(crease of creases){
        if(crease.faces.length !=2){continue}
        //matrix[faces.indexOf(crease.faces[0])][faces.indexOf(crease.faces[1])] = crease
        //matrix[faces.indexOf(crease.faces[1])][faces.indexOf(crease.faces[0])] = crease

        crease.faces[1].neighbors.push(crease.faces[0])
        crease.faces[0].neighbors.push(crease.faces[1])
    }

    return [faces,matrix]
}
function pointOnLine(p,line){
    //if the point lies on the line segment
    //will return true if the point lies on one of the line segments
    try{var a = line.points[0]
        var b = line.points[1]}
    catch{ //if the line was actually a crease object, of a face
        var a = line.vertices[0]
        var b = line.vertices[1]
    }
    ap = [a.xf-p.xf, a.yf-p.yf]
    bp = [b.xf-p.xf, b.yf-p.yf]
    if(eq(dot(ap,bp),-1*(ap[0]**2 + ap[1]**2)**0.5*(bp[0]**2 + bp[1]**2)**0.5)){
        //first condition checks if it's in the line, has the same slope. second condition
        return true
    } else {return false}
}
function isPointInPolygon(point,polygon){
    //will be used to test if a stack is within a face. ie if the face should make a subface for the stack.
    //horizontal line method https://en.wikipedia.org/wiki/Point_in_polygon
    //if the testline crosses one of the points exactly tangentially, it will count it as 2 intersections (one on either side of the line)
    //even if the testline is coincident with one of the lines, it will reject as no intersection with the coincident one, 
        //and will count the intersection as soon as it hits the next line
    
    var crosses = 0
    var testline = new Stackline(point, new Stackpoint(100,point.yf))
    for(const line of polygon.creases){
        if(pointOnLine(point,line)){
            return true //we accept being on the border or on a vertexas being in the polygon
        }
        if(linesIntersection(line.points[0],line.points[1],testline.points[0],testline.points[1])){
            crosses++
        }
    }
    if(crosses%2==0){return false} 
    else{return true}
}
function linesIntersection(v1,v2,v3,v4){
    //https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    const [x1,y1] = [v1.xf,v1.yf]   
    const [x2,y2] = [v2.xf,v2.yf]
    const [x3,y3] = [v3.xf,v3.yf]
    const [x4,y4] = [v4.xf,v4.yf] 

    const [a1,b1, a2, b2] = [y2-y1,x2-x1 , y4-y3,x4-x3]
    const [c1,c2] = [a1*x1 + b1*y1 , a2*x3 + b2*y3]
    const det = a1*b2 - a2*b1
    if(det == 0){return null} //lines are parallel

    //const x = (b2*c1 - b1*c2)/det
    //const y = (a1*c2 - a2*c1)/det

    const x = ((x1*y2 - y1*x2)*(b2) - (b1)*(x3*y4 - y3*x4))/det
    const y = ((x1*y2 - y1*x2)*(a2) - (a1)*(x3*y4 - y3*x4))/det

    //if the dot product of v1-p , v2-p is negative, the intersection crosses line 1. if 0, it's a T junction.
    //we only want when it crosses both--skip t junction for now.
    if(!(dot([x1-x,y1-y],[x2-x,y2-y]) < 0 & dot([x3-x,y3-y],[x4-x,y4-y]) < 0)) {return null} //no intersection
    else{return [x,y]} //the intersection lies along at least one of the lines
}
function assignFaces(faces,startingFace){
    faces.forEach(element => element.assigned = false)
    startingFace.assigned = true
    spread(startingFace)
}
function spread(face){
    for(const neighbor of face.neighbors){
        if((!neighbor.assigned) & ['M','V'].includes(face.creases.find(element=>neighbor.creases.includes(element)).mv)){
            neighbor.assigned = true
            spread(neighbor)
        }
    }
}

//Local flat foldability
function isVertexFlatFoldable(vertex){

    //get angles of creases. For each crease, use atan2 on the other vertex
    vertex.angles = []
    for(const crease of vertex.creases){
        vertex.angles.push(
            Math.atan2(crease.vertices[0].y - vertex.y,crease.vertices[0].x - vertex.x)+
            Math.atan2(crease.vertices[1].y - vertex.y,crease.vertices[1].x - vertex.x) 
            //one of thee crease's vertices will be vertex vertex, so the atan2 will return 0
        ) 
    }
    vertex.creases.sort((a,b)=>vertex.angles[vertex.creases.indexOf(a)]-vertex.angles[vertex.creases.indexOf(b)]) //sort creases based on angle
    vertex.angles.sort((a,b)=>a-b)

    //sector i will correspond to the angle between crease i and crease i-1 (and 0 wraps around to n)
    vertex.sectors = [Math.PI - Math.abs((vertex.angles[0]-vertex.angles[vertex.angles.length-1]))%(Math.PI)]; //the wrap around angle
    for(i=1;i<vertex.angles.length; i++){vertex.sectors.push(vertex.angles[i]-vertex.angles[i-1])}

    /*
    There are a number of flat foldability conditions that must be met, and we have to go in order
    big little big lemma?
    on the paper edge?
    big angle theorem?
    even number of creases?
    m-v = 2? 
    sum of every other crease?
    */
    
    //look for big little big violations: a local min sector angle with same mv on each side
    var violations = false
    var sectorsCopy = structuredClone(vertex.sectors)
    var creasesCopy = structuredClone(vertex.creases)
    mainloop: while(creasesCopy.length >2){
        var minAngle = Math.min(...sectorsCopy)
        for(i=0;i<sectorsCopy.length;i++){
            if(sectorsCopy.length != creasesCopy.length){console.log(vertex,sectorsCopy,creasesCopy); throw new Error("sectors and creases are different")}
            if(eq(sectorsCopy[i],minAngle)){
                if(creasesCopy[i].mv != creasesCopy[i!=0? i-1 : creasesCopy.length-1].mv | creasesCopy[i].mv == 'A' | creasesCopy[i].mv == 'E'){
                    creasesCopy.splice(i,1); creasesCopy.splice(i!=0? i-1 : creasesCopy.length-1 , 1) //delete both creases from the sector
                    sectorsCopy[i!=sectorsCopy.length-1?i+1 : 0] += sectorsCopy[i!=0? i-1 : sectorsCopy.length-1] - sectorsCopy[i] //combine neighboring sectors
                    sectorsCopy.splice(i,1); sectorsCopy.splice(i!=0? i-1 : sectorsCopy.length-1 , 1) //delete this sector and one neighbor
                    continue mainloop
                }else{
                    violations = true
                }
            }            
        }
        if(violations){
            vertex.angularFoldable = false; vertex.reason = "big little big lemma";return false
        }
    }
    violations = false

    /*
    for(i=0; i<vertex.sectors.length; i++){
        if(vertex.sectors[i]<vertex.sectors[i!=0?i-1:vertex.sectors.length-1] - 10**-10 &
            vertex.sectors[i]<vertex.sectors[i!=vertex.sectors.length-1?i+1:0] - 10**-10 &
            vertex.creases[i].mv == (i!=0?vertex.creases[i-1]:vertex.creases[vertex.creases.length-1]).mv &
            vertex.creases[i].mv != 'A' & vertex.creases[i].mv != 'E'
        ){
            vertex.angularFoldable = false; vertex.reason = "big little big lemma";return false
        }
    }
    */
    
    //if the vertex is on the edge
    if(eq(vertex.x*vertex.y*(1-vertex.x)*(1-vertex.y),0)){vertex.angularFoldable=true; vertex.reason = "on the edge"; return true;}
    
    //big angle theorem: of all the sector(s) with maximum angle, at least one has to have same mv on each side
    var max = Math.max(...vertex.sectors) - 10**-10
    var bigIndices = [] //all the global maxes. if any of thmem are iso, we're ok
    var violatedBigAngle = true
    vertex.sectors.forEach((item,index)=> item>=max?bigIndices.push(index):null)
    if(bigIndices.length >1){violatedBigAngle = false}
    if(vertex.creases[bigIndices[0]].mv == vertex.creases[(bigIndices[0]!=0?bigIndices[0]-1:vertex.creases.length-1)].mv |
        vertex.creases[bigIndices[0]].mv == 'A' | vertex.creases[(bigIndices[0]!=0?bigIndices[0]-1:vertex.creases.length-1)].mv == 'A'
    ){
        violatedBigAngle = false;
    }
    if(violatedBigAngle){vertex.angularFoldable = false; vertex.reason = "big angle"; return false}
    
    //If there's an odd number of creases
    if(vertex.creases.length%2!=0){vertex.angularFoldable=false; vertex.reason = "odd creases"; return false;} 

    //if the sum of every other angle is not 180
    //add and subtract the sum of every other angle. 2nd - 1st + 4th - 3rd, etc
    var total = vertex.angles.map(a => vertex.angles.indexOf(a)%2==0? -1*a:a).reduce((accumulator,currentvalue) => accumulator + currentvalue)
    if(!eq(total,Math.PI)){vertex.angularFoldable=false; vertex.reason = "angle sum"; return false} 

    //m-v = -+2, although some might be aux
    var M = 0;
    var V = 0;
    var A = 0;
    for(const crease of vertex.creases){
        if(crease.mv == 'M'){M+=1}
        if(crease.mv == 'V'){V+=1}
        if(crease.mv == 'A'){A+=1}
    }
    //if too many M or V that m-v = +-2 is already violated
    if(Math.max(M,V)>(vertex.creases.length /2 + 1)){vertex.angularFoldable=false; vertex.reason = "too many M or V"; return false} 
    if(M == V & A<2){vertex.angularFoldable=false; vertex.reason = "equal M and V"; return false}

    else{vertex.angularFoldable=true;vertex.reason = "default"; return true}
}
function checkLocalFlatFoldability(CP){
    //return true if there are no problems. return false if there are any issues.
    for(const vertex of CP.vertices){
        if(!isVertexFlatFoldable(vertex)){
            //console.log(vertex.x,vertex.y,vertex.reason)
            return false
        }
    }
    return true
}

//global flat foldability
function testGlobal(cp){
    mergeFaces(cp) //press all the faces together. watch out for duplicate vertices and coincident lines
    cleanup(cp) //remove duplicate lines and create new intersections
    cp.stacks = findStackOutlines(cp.stacklines) //find stacks from the outline of the x ray
    findStackNeighbors(cp) //find what stacks are neighboring
    findSubfaces(cp) //find what faces are part of which stacks
    arrangeSubfaces(cp)//at the end returns true or false
}
function mergeFaces(cp){
    //combine folded faces onto each other to create a new graph, the xray map
    assignFaces(cp.faces,cp.faces[0])
    cp.stackpoints = []
    cp.stacklines = []
    for(const face of cp.assignedFaces){
        //transfer vertices
        for(const vertex of face.vertices){
            //create a stackpoint where vertex was
            var newpoint = new Stackpoint(vertex.xf,vertex.yf)
            var duplicate = false
            for(const oldpoint of cp.stackpoints){
                if(eq(oldpoint.xf,newpoint.xf) && eq(oldpoint.yf,newpoint.yf)){duplicate = true; break}
            }
            if(duplicate){continue}
            cp.stackpoints.push(newpoint)
        }
        //transfer creases
        for(const crease of face.creases){
            //create a stack line where the crease was
            //see if we can reuse existing stackpoints
            var p1 = null
            var p2 = null
            for(const oldpoint of cp.stackpoints){
                if(eq(oldpoint.xf,crease.vertices[0].xf) && eq(oldpoint.yf,crease.vertices[0].yf)){p1 = oldpoint; continue}
                if(eq(oldpoint.xf,crease.vertices[1].xf) && eq(oldpoint.yf,crease.vertices[1].yf)){p2 = oldpoint; continue}
            }
            if(p1==null){p1 = new Stackpoint(crease.vertices[0].xf,crease.vertices[0].yf)}
            if(p2==null){p2 = new Stackpoint(crease.vertices[1].xf,crease.vertices[1].yf)}
            
            var newLine = new Stackline(p1,p2)

            var duplicate = false
            for(const oldLine of cp.stacklines){
                if(oldLine==null){continue}
                var commonIndices = haveCommonElement(oldLine.points,newLine.points)
                //if they have two vertices in common, just don't even bother with newline
                if(commonIndices.length==2){duplicate = true; break}
                //if they have only one vertex in common and are colinear (same atan2)
                if(commonIndices.length==1){
                    var p = oldLine.points[commonIndices[0][0]] //the point in common
                    var a = oldLine.points[commonIndices[0][0]==0?1:0] //oldline's other point
                    var b = newLine.points[commonIndices[0][1]==0?1:0] //newline's other point
                    if(eq(Math.atan2(b.yf-p.yf,b.xf-p.xf),Math.atan2(a.yf-p.yf,a.xf-p.xf))){
                        //then instead of having lines pa and pb, have pa and ab (if a is closer). otherwise have pb and ba
                        delete(cp.stacklines[cp.stacklines.indexOf(oldLine)])

                        var closerpoint = Math.abs(a.xf-p.xf)+Math.abs(a.yf-p.yf) < Math.abs(b.xf-p.xf)+Math.abs(b.yf-p.yf) ? a:b
                        //we can just add the distance instead of uusing distance formula because they are already colinear
                        var furtherpoint = (a==closerpoint?b:a)
                        var newLine1 = new Stackline(p,closerpoint)
                        var newLine2 = new Stackline(closerpoint,furtherpoint)
                        cp.stacklines.push(newLine1,newLine2)
                        duplicate = true; break
                    }
                }
                if(commonIndices.length==0){
                    //mostly ok except for the case with lines ab and cd, points are colinear and in acbd order
                    //handle cp case now because they are parallel and won't be noticed by the line intersection function
                    if(eq(Math.abs(Math.atan(oldLine.points[0].yf-oldLine.points[1].yf,oldLine.points[0].xf-oldLine.points[1].xf)),
                          Math.abs(Math.atan(newLine.points[0].yf-newLine.points[1].yf,newLine.points[0].xf-newLine.points[1].xf))) &
                          (pointOnLine(oldLine.points[0],newLine) | pointOnLine(oldLine.points[1],newLine)&
                            pointOnLine(newLine.points[0],oldLine) | pointOnLine(newLine.points[1],oldLine)   ) |
                          (pointOnLine(newLine.points[0],oldLine) & pointOnLine(newLine.points[1],oldLine)) | 
                          (pointOnLine(oldLine.points[0],newLine) & pointOnLine(oldLine.points[1],newLine)) ){
                        //points are colinear. now find order
                        var fourPoints = [oldLine.points[0],oldLine.points[1],newLine.points[0],newLine.points[1]]
                        fourPoints.sort((a,b) => (Math.abs(a.xf)+Math.abs(a.yf)) - (Math.abs(b.xf)+Math.abs(b.yf)))
                        delete(cp.stacklines[cp.stacklines.indexOf(oldLine)])
                        cp.stacklines.push(new Stackline(fourPoints[0],fourPoints[1]))
                        cp.stacklines.push(new Stackline(fourPoints[1],fourPoints[2]))
                        cp.stacklines.push(new Stackline(fourPoints[2],fourPoints[3]))
                    }
                    
                }
            }
            if(!duplicate){
                cp.stacklines.push(newLine)
            }
        }
    }
}
function cleanup(cp){
    cp.stacklines = cp.stacklines.filter(Boolean) //remove the deleted empty ones

    //now check for intersections that happen not on existing vertices
    for(const line1 of cp.stacklines.slice(0,cp.stacklines.length-1)){
        if(line1==null){continue}
        for(const line2 of cp.stacklines.slice(cp.stacklines.indexOf(line1)+1,cp.stacklines.length)){
            if(line2==null | line1 == null){continue}
            //check for direct duplicates
            if(haveSameContents(line1.points,line2.points)){
                delete(cp.stacklines[cp.stacklines.indexOf(line1)])
                continue
            }

            var intersection = linesIntersection(...line1.points,...line2.points)
            if(intersection){
                //add the intersection as a new point, if it wasn't there already. Otherwise, p will be a T junction
                var duplicate = false
                p = new Stackpoint(...intersection)
                for(const oldpoint of cp.stackpoints){
                    if(eq(oldpoint.xf,intersection[0]) && eq(oldpoint.yf,intersection[1])){
                        duplicate = true; var p = oldpoint; break
                    }
                }
                if(!duplicate){var p = new Stackpoint(...intersection);cp.stackpoints.push(p)}

                //check the intersection on each line. If p is its endpoint, do nothing. if p is in the middle, split the line
                for(const line of [line1,line2]){    
                    if(eq(dot([line.points[0].xf-p.xf,line.points[0].yf-p.yf],[line.points[1].xf-p.xf,line.points[1].yf-p.yf]) , 0)){continue}          
                    if(dot([line.points[0].xf-p.xf,line.points[0].yf-p.yf],[line.points[1].xf-p.xf,line.points[1].yf-p.yf])<0-10^-2){
                        //otherwise, the line will have to split into two lines, because the intersection was somewhere along the line
                        p1 = line.points[0]
                        p2 = line.points[1]
                        delete(cp.stacklines[cp.stacklines.indexOf(line)])
                        newLine1 = new Stackline(p1,p)
                        newLine2 = new Stackline(p,p2)
                        cp.stacklines.push(newLine1,newLine2)
                    }
                    else{console.log('point was not on line',point,line)} //seems to never happen
                }
            }
        }
    }
    //check for duplicates again? the backup delete is useful apparently 
    for(const line1 of cp.stacklines.slice(0,cp.stacklines.length-1)){
        if(line1==null){continue}
        for(const line2 of cp.stacklines.slice(cp.stacklines.indexOf(line1)+1,cp.stacklines.length)){
            if(line2==null | line1 == null){continue}
            if(haveSameContents(line1.points,line2.points)){
                //line2.points[0].lines.splice(line2.points[0].lines.indexOf(line2),1)
                //line2.points[1].lines.splice(line2.points[1].lines.indexOf(line2),1)
                delete(cp.stacklines[cp.stacklines.indexOf(line1)])
                console.log('backup delete')
                continue
            }    
        }
    }

    //tell the points which lines they're connected to
    cp.stacklines = cp.stacklines.filter(Boolean)
    for(const point of cp.stackpoints){point.lines = []}
    for(const line of cp.stacklines){
        line.points[0].lines.push(line)
        line.points[1].lines.push(line)
    }
    cp.stackpoints.forEach((element) => element.sortAngles())

    //one last patch
    
    //look for duplicate angles. delete all except the shortest one per angle
    // for(const point of cp.stackpoints){
    //     point.angles.forEach(function(angle1,index1){
    //         //check if there are duplicate angles--delete all of them except the closest one
    //         var duplicates = []
    //         point.angles.forEach(function(angle2,index2){
    //             if(eq(angle1,angle2)){duplicates.push([index2],point.lines)}
    //         })
    //     })
    // }
    
}
function findStackOutlines(lines){
    //generic algorithm for finding faces of a graph.
    //used for face finding on cp, and stack finding
    //"line" just means an edge of a graph. contains two vertices, which contain creases in angular order

    //faces by default run clockwise. discard counter clockwise faces.
    var stacks = []
    for(const line of lines){
        
        //Find the two faces on either side of the crease
        //Keep turning right until you come back to this crease. See if this face is already found or not.
        //Do this for both directions.
        for(const endPoint of line.points){
            var creaseGroup = []
            var vertexGroup = []; 
            var currentCrease;
            var currentVertex;
            var nextCrease;

            currentCrease = line;
            currentVertex = endPoint;
            while(nextCrease!=line){
                nextCrease = currentVertex.lines[currentVertex.lines.indexOf(currentCrease) + 1]
                if(nextCrease == undefined){nextCrease = currentVertex.lines[0]}//loop around if you were at the end of the list
                creaseGroup.push(nextCrease)
                vertexGroup.push(currentVertex)
                currentCrease = nextCrease
                currentVertex = (currentVertex==currentCrease.points[0]? currentCrease.points[1]:currentCrease.points[0])
                if(line.points.includes(currentVertex)){
                    creaseGroup.push(line);
                    vertexGroup.push(currentVertex);
                    break
                }
            }
            if(creaseGroup.length<3){continue}
            if(!isFaceClockwise(vertexGroup)){continue}
            var isNew = true;
            for(const stack of stacks){
                if(haveSameContents(stack.points,vertexGroup)){
                    var isNew = false;
                    break
                }
            }
            if(isNew){
                var newStack = new Stack(creaseGroup,vertexGroup)
                stacks.push(newStack);
            }
        }
    }
    return stacks
}
function findStackNeighbors(cp){
    for(const stack of cp.stacks){
        for(const line of stack.lines){
            line.stacks.push(stack) //kinda like the lines and points
        }
    }
    //now can find matrix and neighbors and whatnot
    for(const line of cp.stacklines){
        if(line.stacks.length !=2){continue}
        //matrix[stacks.indexOf(line.stacks[1])][stacks.indexOf(line.stacks[0])] = line
        //matrix[stacks.indexOf(line.stacks[0])][stacks.indexOf(line.stacks[1])] = line
        line.stacks[1].neighbors.push(line.stacks[0])
        line.stacks[0].neighbors.push(line.stacks[1])
    }
}
function isStackInFace(stack,face){
    //if divided correctly, it should be impossible for some points of the stack to be in and some to be out.
    //however, you can have some that are on the edge and some that are out, and the stack will be out

    //Go through the points on the stack. if any of them miss completely (crosses = 0), the whole thing is false
    //if any of them are on the line, check the next one
    //if any of them are in the face and not on the line, the whole thing is true
    mainloop: for(const point of stack.points){
        var crosses = 0
        var testline = new Stackline(point, new Stackpoint(100,point.yf))
        for(const vertex of face.vertices){
            if(eq(vertex.xf,point.xf) & eq(vertex.yf,point.yf)){
                continue mainloop
            }
        }
        for(const line of face.creases){
            if(linesIntersection(line.vertices[0],line.vertices[1],testline.points[0],testline.points[1])){
                crosses++
            }
            if(pointOnLine(point,line)){
                continue mainloop
            }
        }
        if(crosses%2 == 0){return false}
        if(crosses==1){return true}
    }
    return true
}
function findSubfaces(cp){
    //now create subfaces. iterate through the stacks and see if it's a subface of the face
    for(const face of cp.faces){
        for(const stack of cp.stacks){
            if(isStackInFace(stack,face)){
                var newSubface = new Subface(face,stack)
                stack.subfaces.push(newSubface)
                face.subfaces.push(newSubface)
            }
            
        }
    }
}
function arrangeSubfaces(cp){
    //arrange the stacks
    //by now, we have all our faces, stacks, subfaces, and face matrix and stacks matrix, and subface relations.
    
    //just need to find one arrangement.
    //[random note] a subface is flipped if it's face's distance is odd
    //start from the top of each stack and move down. if subface j needs to be above subface i, move i right below j. continue until stack has been fixed
    //now look for tortilla tortilla: if neighboring stacks 2 and 3 both have subfaces from a and b, and a>b in one and b<a in the other,
        //check if it's possible to move without violating inequalities.
    //check for taco taco and taco tortilla 
    //oof this is tough
}
function displayStacks(xc,yc,scale,cp){
    var totalCenterx = 0.5
    var totalCentery = 0.5

    function convertx(x){
        //Converting cp coords, which range from 0,1, into js coords centered at xc,yc
        //return x1+cp*(x2-x1);
        return (x-totalCenterx)*scale+xc
    }
    function converty(y){
        //also the y coordinates are displayed upside down
        //return y1-cp*(y1-y2);
        return(y-totalCentery)*scale+yc
    }
    var stacks = new paper.Group();
    for(const line of cp.stacklines){
        var displayline = new paper.Path.Line(
            new paper.Point(convertx(line.points[0].xf),converty(line.points[0].yf)),
            new paper.Point(convertx(line.points[1].xf),converty(line.points[1].yf))
        )
        displayline.opacity = 0.3
        displayline.strokeWidth = 10
        displayline.strokeColor = "#EB5160"
    }
    for(const point of cp.stackpoints){
        var circle = new paper.Path.Circle({
            center: new paper.Point(convertx(point.xf),converty(point.yf)),
            radius: 15,
            opacity: 0.3,
            fillColor: 'purple'
        })
    }
    for(const stack of cp.stacks){
        var displaystack = new paper.Path();
        for(const point of stack.points){
            displaystack.add(new paper.Point(convertx(point.xf),converty(point.yf)))
        }
        displaystack.closed = true;
        displaystack.strokeColor = 'black'
        displaystack.opacity = 0.3
        displaystack.fillColor = 'blue'
        displaystack.strokeWidth = (scale)/200;
        stacks.addChild(displaystack)

        var centerx = 0
        var centery = 0
        for(const point of stack.points){centerx += point.xf; centery += point.yf}
        centerx = centerx/stack.points.length
        centery = centery/stack.points.length
        var center = new paper.Point(
            convertx(centerx),
            converty(centery))
        var text = new paper.PointText(center)
        text.content = stack.subfaces.length
    }
}



