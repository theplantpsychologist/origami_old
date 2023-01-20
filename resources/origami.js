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
    /*addCrease(v2){
        //Add a crease that connects to other vertex v2
        //Check to see if v2 already exists or not
        v2exists = false
        for(var j = 0; j<vertices.length; j++){
            if(vertices[j].x == v2.x && vertices[j].y == v2.y){
                v2 = vertices[j]
                v2exists = true
                break
            }
        }
        if(!v2exists){vertices.push(v2)}
        crease = new Crease(this,v2)
        creases.push(crease)
        this.connectedCreases.push(crease)
        v2.connectedCreases.push(crease)
    }*/
    checkAngularFlatFoldability(){

        //get angles of creases. For each crease, use atan2 on the other vertex
        this.angles = []
        for(i=0; i<this.creases.length; i++){
            this.angles.push(
                Math.atan2(this.creases[i].vertices[0].y - this.y,this.creases[i].vertices[0].x - this.x)+
                Math.atan2(this.creases[i].vertices[1].y - this.y,this.creases[i].vertices[1].x - this.x) 
                //one of thee crease's vertices will be this vertex, so the atan2 will return 0
            ) 
        }
        this.creases.sort((a,b)=>this.angles[this.creases.indexOf(a)]-this.angles[this.creases.indexOf(b)]) //sort creases based on angle
        this.angles.sort((a,b)=>a-b)
        //Now add and subtract the sum of every other angle. 2nd - 1st + 4th - 3rd, etc
        var total = this.angles.map(a => this.angles.indexOf(a)%2==0? -1*a:a).reduce((accumulator,currentvalue) => accumulator + currentvalue)

        if(eq(this.x*this.y*(1-this.x)*(1-this.y),0)){this.angularFoldable=true; return true;} //if the vertex is on the edge
        if(this.creases.length%2!=0){this.angularFoldable=false; return false;} //If there's an odd number of creases
        if(!eq(total,Math.PI)){this.angularFoldable=false;return false} //if the sum of every other angle is not 180
        //m-v = -+2
        var M = 0;
        var V = 0;
        var A = 0;
        for(i=0;i<this.creases.length; i++){
            if(this.creases[i].mv == 'M'){M+=1}
            if(this.creases[i].mv == 'V'){V+=1}
            if(this.creases[i].mv == 'A'){A+=1}
        }
        if(Math.max(M,V)>(this.creases.length /2 + 1)){this.angularFoldable=false;return false} //if m-v = -+2 is violated already

        //we'll leave big little big lemma for self intersection... maybe
        else{this.angularFoldable=true;return true}
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
        this.angularFoldable = true;
        for(j=0;j<this.vertices.length;j++){ //this needs to be not i, bc i is used in a loop when checking a vertex
            if(!this.vertices[j].checkAngularFlatFoldability()){
                this.angularFoldable = false;
            }
        }
    }
    
    foldXray(){
        //assign folded coordinates to vertices
        var startingFace = this.faces[0] //this is arbitrarily chosen
        const n = this.faces.length
        //bfs throughout the graph to give every face a distance from the starting face
        startingFace.distance = 0;
        startingFace.assigned = true
        function spread(face){
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
                    spread(neighbor)
                }
            }
        }
        spread(startingFace)
    
        for(const face of this.faces){
            var stepsAway = face.distance;
            const index = this.faces.indexOf(face)
            for(const vertex of face.vertices){
                [vertex.xf,vertex.yf] = [vertex.x,vertex.y]
            }
            var currentFace = face
            while(stepsAway>0){
                //
                var neighbor = currentFace.neighbors.find(element=>element.distance ==stepsAway-1)
                var reflector = currentFace.creases.find(element=>neighbor.creases.includes(element))//this.matrix[index][this.faces.indexOf(neighbor)]
                reflectFace(face,reflector)
                stepsAway = neighbor.distance
                currentFace = neighbor
            }
        }
        

        //for each face, find the path to the starting face. reset xf = x before doing anything
        //keep reflecting along the path, updating xf until you get get to the starting face
    }
    findStacks1(){
        this.assignedFaces = []
        for(const face of this.faces){if(face.assigned){this.assignedFaces.push(face)}}

        //combine folded faces onto each other to create a new graph, the xray map
        //run an alg similar to face finding but now on the xray map
        this.stackpoints = []
        this.stackedges = []
        for(const face of assignedFaces){
            for(const vertex of face.vertices){
                //create a stackpoint where vertex was
                var newpoint = new Stackpoint(vertex.xf,vertex.yf)
                var duplicate = false
                for(const oldpoint of this.stackpoints){
                    if(oldpoint.xf == newpoint.xf && oldpoint.yf == newpoint.yf){duplicate = true; break}
                }
                if(duplicate){continue}
                this.stackpoints.push(newpoint)
            }
            for(const crease of face.creases){
                //create a stack edge where the crease was
                var p1 = null
                var p2 = null
                for(const oldpoint of this.stackpoints){
                    if(oldpoint.xf == crease.vertices[0].xf && oldpoint.yf == crease.vertices[0].yf){p1 = oldpoint; continue}
                    if(oldpoint.xf == crease.vertices[1].xf && oldpoint.yf == crease.vertices[1].yf){p2 = oldpoint; continue}
                }
                if(p1==null){p1 = new Stackpoint(crease.vertices[0].xf,crease.vertices[0].yf)}
                if(p2==null){p2 = new Stackpoint(crease.vertices[1].xf,crease.vertices[1].yf)}
                var duplicate = false
                for(const oldline of this.stackedges){
                    if(haveSameContents(oldline.vertices,[p1,p2])){duplicate = true}
                }
                if(duplicate){continue}
                this.stackedges.push(new Stackline(p1,p2))
            }
        }
        split(this.stackedges,this.stackpoints) //this function will split things but will replace them with crease and vertex objects
        [this.stacks,this.stackmatrix] = findStacks(this.stackedges) 


        //now create subfaces. iterate through the stacks and see if it's a subface of the face
    }
    findStacks2(){
        this.assignedFaces = []
        for(const face of this.faces){
            if(face.assigned){this.assignedFaces.push(face)}}

        //Start with each face as a stack. Go through the stacks, merging/splitting until no stacks overlap.
        //Then make the subfaces. For each face, see which stacks it overlaps.
        this.stacks = []
        for(const face of this.assignedFaces){
            //create a stack based on this face. use special stack objects
            var stack = new Stack()
            for(const crease of face.creases){
                var p1 = new Stackpoint(crease.vertices[0].xf,crease.vertices[0].yf)
                var p2 = new Stackpoint(crease.vertices[1].xf,crease.vertices[1].yf)
                stack.lines.push(new Stackline(p1,p2))
                for(const point of stack.points){
                    if(point.xf==p1.xf && point.yf == p1.yf){p1 = null}
                    else if(point.xf==p2.xf && point.yf == p2.yf){p2 = null}
                }
                if(p1!=null){stack.points.push(p1)}
                if(p2!=null){stack.points.push(p2)}
            }
            this.stacks.push(stack)
        }
        for(i=0;i<this.stacks.length;i++){
            //for each stack, iterate through the remaining stacks to see if there are any overlaps. 
            //once the stack has no overlaps, move on, and nobody bother with it bc it doesn't overlap anyone
            //if there was an overlap, the current stack becomes the union. and the not overlapped parts are pushed to the end of the list of stacks
            for(j=i+1;j<this.stacks.length;j++){
                //compare stacks[i] and stacks[j]
                //current stack becomes the union. stack[j] gets deleted. the rest gets pushed to the end
            }
        }

        for(const face of this.faces){
            for(const stack of this.stacks){
                //if they overlap (all stack vertices are in or on the face)
                //make a new subface based on the stackpoints of the stack. add to stack and add to face
            }
        }

        //go through stacks and find neighbors
        //go through subfaces and figure out which other subfaces in its stack it's connected to by crease. neighbors must be in stack
    }
    testFoldability(){
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
    displayCp(x1,y1,x2,y2){ //so you can position where to draw it
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
        for(i=0;i<this.creases.length;i++){
            line = new paper.Path.Line(
                new paper.Point(convertx(this.creases[i].vertices[0].x),converty(this.creases[i].vertices[0].y)),
                new paper.Point(convertx(this.creases[i].vertices[1].x),converty(this.creases[i].vertices[1].y))
            )
            line.strokeColor = creases[i].mv=='M'?"#EB5160" : creases[i].mv=='V'?"#33A1FD" : creases[i].mv=='A'?"#0DE4B3":'black'
            creaselines.addChild(line);
        }
        creaselines.strokeWidth = (x2-x1)/200;

        var errorcircles = new paper.Group();
        for(i=0;i<this.vertices.length;i++){
            if(!this.vertices[i].angularFoldable){
                var circle = new paper.Path.Circle({
                    center: new paper.Point(convertx(this.vertices[i].x),converty(this.vertices[i].y)),
                    radius: (x2-x1)/30,
                    opacity: 0.3,
                    fillColor: 'purple'
                })
                errorcircles.addChild(circle);
            }
        }
    }
    displayXray(xc,yc,scale){
        var centerx = 0
        var centery = 0
        for(const vertex of this.vertices){centerx += vertex.xf; centery += vertex.yf}
        centerx = centerx/this.vertices.length
        centery = centery/this.vertices.length

        function convertx(cp){
            //Converting cp coords, which range from 0,1, into js coords centered at xc,yc
            //return x1+cp*(x2-x1);
            return (cp-centerx)*scale+xc
        }
        function converty(cp){
            //also the y coordinates are displayed upside down
            //return y1-cp*(y1-y2);
            return(cp-centery)*scale+yc
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
            /* for displaying distance from center
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

function readCpFile(file){
    //Inputs the cp file as an array, where each item in the array is the line as a string
    //Reads the cp file for the vertices and creases
    //Returns a CP object

    //For now, we're assuming the cp is in the [-200,200] box, and will ignore all edge lines
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

function exportCpFile(CP){
    console.log("stay tuned")
}

//==================================================================
//auxiliary functions
//==================================================================

function eq(a,b){
    if(Math.abs(a-b)>10**(-8)){return false} else {return true}
}

function split(creases,vertices){
    //takes in a list of creases and vertices
    /*need to fix things like:
        - two creases cross,crossed vertex isn't represented
        - crease starts/ends on another crease
     coincident creases and vertices should be taken care of when graph is created
    */
    for(i = 0; i<creases.length; i++){
        for(j=i+1;j<creases.length;j++){
            //if([creases[1].vertices])
            var intersection = linesIntersection(creases[i],creases[j])

        }
    }
    for(i=0;i<vertices.length;i++){

    }


    return[creases,vertices]
    //when this is done, fix the read cp function
}

//face finding
function reflectPoint(v1,v2,v3){
    var v = [v3.x-v2.x , v3.y-v2.y]
    var u = [v1.xf-v2.x , v1.yf-v2.y]
    var p = [v2.x+v[0]*(u[1]*v[1] + u[0]*v[0])/(v[1]**2+v[0]**2), v2.y+v[1]*(u[1]*v[1] + u[0]*v[0])/(v[1]**2+v[0]**2)]
    var v4 = [v1.xf+2*(p[0]-v1.xf) , v1.yf+2*(p[1]-v1.yf)]
    return v4
}
function reflectFace(moving,reflector){
    //fixed: face that isn't moving
    //moving: face that is moving
    //reflector: the crease between the two faces
    for(const vertex of moving.vertices){
        [vertex.xf,vertex.yf] = reflectPoint(vertex,reflector.vertices[0],reflector.vertices[1])
    }
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
function isFaceClockwise(vertices){
    //https://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-points-are-in-clockwise-order
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
function findFaces(creases){
    //generic algorithm for finding faces of a graph.
    //used for face finding on cp, and stack finding
    //"crease" just means an edge of a graph. contains two vertices, which contain creases in angular order

    //faces by default run clockwise. discard counter clockwise faces.
    var faces = []
    for(const crease of creases){
        //if(i%10==0){console.log(i)}
        //if(crease.mv== 'E'){continue}
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
            if(!isFaceClockwise(vertexGroup)){continue}
            var isNew = true;
            
            for(const face of faces){
                if(haveSameContents(face.vertices,vertexGroup)){
                    crease.faces.push(face)
                    var isNew = false;
                }
            }
            if(isNew){
                var newFace = new Face(creaseGroup,vertexGroup)
                faces.push(newFace);
                crease.faces.push(newFace);
            }
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
        var value
        
        matrix[faces.indexOf(crease.faces[1])][faces.indexOf(crease.faces[0])] = crease
        matrix[faces.indexOf(crease.faces[0])][faces.indexOf(crease.faces[1])] = crease

        crease.faces[1].neighbors.push(crease.faces[0])
        crease.faces[0].neighbors.push(crease.faces[1])
    }

    return [faces,matrix]
}

function findStacks(lines){
    //generic algorithm for finding faces of a graph.
    //used for face finding on cp, and stack finding
    //"line" just means an edge of a graph. contains two vertices, which contain creases in angular order

    //faces by default run clockwise. discard counter clockwise faces.
    var stacks = []
    for(const line of lines){
        //if(i%10==0){console.log(i)}
        //if(crease.mv== 'E'){continue}
        //Find the two faces on either side of the crease
        //Keep turning right until you come back to this crease. See if this face is already found or not.
        //Do this for both directions.
        for(const endPoint of line.points){
            var creaseGroup = []
            var vertexGroup = []; 
            var currentCrease;
            var currentVertex;
            var nextCrease;

            currentCrease = crease;
            currentVertex = endPoint;
            while(nextCrease!=crease){
                nextCrease = currentVertex.lines[currentVertex.lines.indexOf(currentCrease) + 1]
                if(nextCrease == undefined){nextCrease = currentVertex.lines[0]}//loop around if you were at the end of the list
                creaseGroup.push(nextCrease)
                vertexGroup.push(currentVertex)
                currentCrease = nextCrease
                if(currentCrease.points[0]==currentVertex){currentVertex = currentCrease.points[1]} else {currentVertex = currentCrease.points[0]}
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
                    line.stacks.push(stack)
                    var isNew = false;
                }
            }
            if(isNew){
                var newStack = new Stack(creaseGroup,vertexGroup)
                stacks.push(newStack);
                line.stacks.push(newStack);
            }
        }
    }

    //now we make the connectivity matrix
    const n = stacks.length
    matrix = []
    for(i=0;i<n;i++){
        matrix.push(Array.apply(null, Array(n))) //make an empty nxn matrix
    }
    for(const line of lines){
        if(line.stacks.length !=2){continue}
        var value
        
        matrix[stacks.indexOf(line.stacks[1])][stacks.indexOf(line.stacks[0])] = line
        matrix[stacks.indexOf(line.stacks[0])][stacks.indexOf(line.stacks[1])] = line

        line.stacks[1].neighbors.push(line.stacks[0])
        line.stacks[0].neighbors.push(line.stacks[1])
    }

    return [faces,matrix]
}

//subface finding
//remember that although faces are convex, stacks might not be
//https://www.swtestacademy.com/intersection-convex-polygons-algorithm/
function isPointInPolygon(point,stack){

}
function linesIntersection(v1,v2,v3,v4){
    //https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    //for each line of one polygon, test to each line of the other polygon
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
    return [x,y]
}
function isSubfaceOf(subface,face){
    //subface: list of the smaller polygon vertices. probably a stack
    //face: the face in question
    //go through each of subface's vertices. see if it's in the polygon. if all are in or on, return true
}
