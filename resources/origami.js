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
        if(this.x*this.y*(1-this.x)*(1-this.y)==0){this.angularFoldable=true; return true;} //if the vertex is on the edge
        if(this.creases.length%2!=0){this.angularFoldable=false; return false;}
        //get angles of creases. For each crease, use atan2 on the other vertex
        angles = []
        for(i=0; i<this.creases.length; i++){
            angles.push(
                atan2(this.creases[i].vertices[0].y - this.y,this.creases[i].vertices[0].x - this.x)+
                atan2(this.creases[i].vertices[1].y - this.y,this.creases[i].vertices[1].x - this.x) 
                //one of thee crease's vertices will be this vertex, so the atan2 will return 0
            ) 
        }
        angles.sort((a,b)=>a-b)
        //Now add and subtract the sum of every other angle. 2nd - 1st + 4th - 3rd, etc
        angles = angles.map(a => test.indexOf(a)%2==0? -1*a:a)
        total = angles.reduce((accumulator,currentvalue) => accumulator + currentvalue)

        if(total==Math.PI){this.angularFoldable=true;return true}
        else{this.angularFoldable=false;return false}
    }
}
class Crease {
    constructor(v1,v2,mv){
        this.vertices = [v1,v2]
        this.mv = mv
        this.faces = []
    }
}
class CP {
    constructor(vertices,creases){
        this.vertices = vertices;
        this.creases = creases;
        this.angularFoldable = true;
        for(i=0;i<this.vertices.length;i++){
            this.vertices[i].checkAngularFlatFoldability
            if(!this.vertices[i].checkAngularFlatFoldability){
                this.angularFoldable = false;
            }
        }
    }
    findFaces(){
        //find faces
        1+1
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
        var border = new paper.Path.Rectangle(x1,y1,x2-x1,y2-y1);
        border.strokeColor = 'black';
        border.strokeWidth = (x2-x1)/100;

        var creaselines = new paper.Group();
        for(i=0;i<this.creases.length;i++){
            line = new paper.Path.Line(
                new paper.Point(convertx(this.creases[i].vertices[0].x),converty(this.creases[i].vertices[0].y)),
                new paper.Point(convertx(this.creases[i].vertices[1].x),converty(this.creases[i].vertices[1].y))
            )
            line.strokeColor = creases[i].mv=='M'?"#EB5160" : creases[i].mv=='V'?"#33A1FD" : "#0DE4B3"
            creaselines.addChild(line);
        }
        creaselines.strokeWidth = (x2-x1)/200;

        var errorcircles = new paper.Group();
        for(i=0;i<this.vertices.length;i++){
            if(!this.vertices[i].checkAngularFlatFoldability){
                circle = new paper.Path.Circle({
                    center: new paper.Point(convertx(this.vertices[i].x),converty(this.vertices[i].y)),
                    radius: (x2-x1)/30,
                    opacity: 0.3,
                    fillColor: 'purple'
                })
                errorcircles.addChild(circle);
            }
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
        else if(line[0]=='4'){mv='aux'}
        else{continue} //includes edges
        line = line.map(parseFloat).map(convert)

        v1 = null;
        v2 = null;
        for(j=0;j<vertices.length;j++){
            if(vertices[j].x == line[1] && vertices[j].y == line[2]){
                v1 = vertices[j];
            }
            if(vertices[j].x == line[3] && vertices[j].y == line[4]){
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
    return new CP(vertices,creases)
}