/*Origami classes and data structures

Vertex: 
- x and y coordinates on cp
- x and y coordinates on folded model
- list of crease objects connected to it
- boolean: locally flat foldable (by angles)

- add a new crease

Crease: 
- list of two vertices
- list of two faces
- MVA

Face:
- list of creases
- list of vertices
- list of neighboring faces
- boolean: flipped?
- boolean: assigned? 
- list of subfaces

Subface:
- stack that it's in
- face that it's part of
- list of neighboring subfaces (within face, and across creases)

Stack:
- list of neighboring stacks
- list of subface objects, in order

CreasePattern: 
- list of vertex objects
- list of crease objects

- list of face objects
- list of stacks

- boolean: locally flat foldable (x ray possible?)
- boolean: globally flat foldable (no self intersection)

- display cp
- display x ray
- display layered model
- export as .cp
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
    findFaces(){
        //Create face objects based on the creases
        this.faces = []
        for(i=0;i<this.creases.length;i++){
            if(this.creases[i].mv== 'E'){continue}
            //Find the two faces on either side of the crease
            //Keep turning right until you come back to this crease. See if this face is already found or not.
            //Do this for both directions.
            for(j = 0;j<2;j++){
                var creaseGroup = []
                var vertexGroup = []; 
                var currentCrease;
                var currentVertex;
                var nextCrease;

                currentCrease = this.creases[i];
                currentVertex = this.creases[i].vertices[j];
                while(nextCrease!=this.creases[i]){
                    nextCrease = currentVertex.creases[currentVertex.creases.indexOf(currentCrease) + 1]
                    if(nextCrease == undefined){nextCrease = currentVertex.creases[0]}//loop around if you were at the end of the list
                    creaseGroup.push(nextCrease)
                    vertexGroup.push(currentVertex)
                    currentCrease = nextCrease
                    if(currentCrease.vertices[0]==currentVertex){currentVertex = currentCrease.vertices[1]} else {currentVertex = currentCrease.vertices[0]}
                    if(this.creases[i].vertices.includes(currentVertex)){
                        creaseGroup.push(this.creases[i]);
                        vertexGroup.push(currentVertex);
                        break
                    }
                }
                if(creaseGroup.length<3){
                    continue
                }
                var isNew = true;
                
                for(var k=0;k<this.faces.length;k++){
                    if(areFacesEqual(this.faces[k].vertices,vertexGroup)){
                        this.creases[i].faces.push(this.faces[k])
                        var isNew = false;

                    }
                }
                if(isNew){
                    var newFace = new Face(creaseGroup,vertexGroup)
                    this.faces.push(newFace);
                    this.creases[i].faces.push(newFace);
                }
            }
        }

        //now we make the connectivity matrix
        const n = this.faces.length
        this.matrix = []
        for(i=0;i<n;i++){
            this.matrix.push(Array.apply(null, Array(n))) //make an empty nxn matrix
        }
        for(i=0;i<this.creases.length;i++){
            if(this.creases[i].faces.length !=2){continue}
            var value
            if(this.creases[i].mv == 'M'){value = 1}
            else if(this.creases[i].mv == 'V'){value = -1}
            else if(this.creases[i].mv == 'A'){value = 0} else{continue} //i think? shouldn' be any edges here
            //was gonna use this--but since we can, let's just put the crease object instead

            this.matrix[this.faces.indexOf(this.creases[i].faces[1])][this.faces.indexOf(this.creases[i].faces[0])] = this.creases[i]
            this.matrix[this.faces.indexOf(this.creases[i].faces[0])][this.faces.indexOf(this.creases[i].faces[1])] = this.creases[i]

            this.creases[i].faces[1].neighbors.push(this.creases[i].faces[0])
            this.creases[i].faces[0].neighbors.push(this.creases[i].faces[1])
        }

        return this.faces
    }
    foldXray(){
        //assign folded coordinates to vertices
        var startingFace = this.faces[0] //this is arbitrarily chosen
        const n = this.faces.length
        //bfs throughout the graph to give every face a distance from the starting face
        startingFace.distance = 0;
        function spread(face){
            for(const neighbor of face.neighbors){
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
    /*
        for(const face of this.faces){
            console.log("placing",face)

            var stepsAway = face.distance;
            const index = this.faces.indexOf(face)
            for(const vertex of face.vertices){
                [vertex.xf,vertex.yf] = [vertex.x,vertex.y]
            }
            while(stepsAway>0){
                //
                console.log("step",stepsAway)
                var neighbor = face.neighbors.find(element=>element.distance <=stepsAway)
                console.log("neighbors",face.neighbors)
                console.log(neighbor)
                var reflector = face.creases.find(element=>neighbor.creases.includes(element))//this.matrix[index][this.faces.indexOf(neighbor)]
                reflectFace(face,reflector)
                stepsAway = neighbor.distance
            }
        }
        */

        //for each face, find the path to the starting face. reset xf = x before doing anything
        //keep reflecting along the path, updating xf until you get get to the starting face
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
    displayXray(x1,y1,x2,y2){
        function convertx(cp){
            //Converting cp coords, which range from 0,1, into js coords which range from x1,x2 and y1,y2
            return x1+cp*(x2-x1);
        }
        function converty(cp){
            //also the y coordinates are displayed upside down
            return y1-cp*(y1-y2);
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
            face.strokeWidth = (x2-x1)/200;

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
        }
        var bruh = new paper.PointText(new paper.Point(200,200))
        bruh.content = 'bruh'
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
        else{continue} //includes edges
        line = line.map(parseFloat).map(convert)

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
        v1.creases.push(crease);
        v2.creases.push(crease);
        creases.push(crease)
    }

    //Now go back in and put the edges based on the vertices that are on the edge
    var topEdge = []
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
    }
    return new CP(vertices,creases)
}

function downloadCpFile(CP){
    console.log("stay tuned")
}

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




function eq(a,b){
    if(Math.abs(a-b)>10**(-12)){return false} else {return true}
}
function areFacesEqual(face,group){
    for(l=0;l<face.length;l++){
        if(!group.includes(face[l])){return false}
    }
    for(l=0;l<group.length;l++){
        if(!face.includes(group[l])){return false}
    }
    return true
}