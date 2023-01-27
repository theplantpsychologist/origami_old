


class PotentialCP{ //extends CP?
    //this is the node of a binary tree. the input cp will be the root node.

    //has a parent and up to 2 children: one m and one v.
    //also has an attribute if it's "alive" or not
    //if it has been checked to be alive, create a mountain child. (unless the cp is done)
    //if it has been checked to not be alive, no more children, and tell the parent

    //if it's mountain child is dead, create a valley child.
    //If the valley child also dies, be marked as dead and go up to parent.
    constructor(CP, parent){
        this.index = globalIndex; globalIndex++
        this.CP = CP //cp object with creases,vertices, faces, etc
        this.parent = parent
        this.children = []
        this.alive = true //"dies" if its not flat foldable, or if both children are dead
    }
    createChild(){
        var child = new PotentialCP(this.CP,this)
        this.children.push(child)

        return child
    }
}

function start(input){
    paper.project.clear();
    globalIndex = 0
    console.log("starting");
    //note: will need to run a split/merge function to clean it up before processing
    inputcp = readCpFile(input);
    displaycp1.clear();
    displaycp1 = inputcp.displayCp(10,50,390,430)

}
function dfs(inputcp){
    //the default way to automatically find one solution
    if(!inputcp.angularFoldable){
        alert("This crease pattern has local flat foldability issues. Please fix the highlighted vertices and try again.")
        return
    }
    inputcp.foldXray(); //already
    //inputcp.displayXray(200,640,380);
    inputcp.findStacks1();
    inputcp.displayStacks(200,640,380);

    //dfs will run a dfs of a binary tree made of PotentialCP until one solution is found
    //it's also running a bfs on a connectivity matrix of the faces. for n faces, we'll store it as an nxn matrix
    //a 0 in spot (i,j) means faces i and j are not connected
    //a
}

function demo(inputcp){
    if(!inputcp.angularFoldable){
        alert("This crease pattern has local flat foldability issues. Please fix the highlighted vertices and try again.")
        return
    }
    inputcp.foldXray(); //already
    try{displayxray.clear()}catch{}
    displayxray = inputcp.displayXray(200,640,380);

    try{displaycp2.clear()}catch{}
    displaycp2 = inputcp.displayCp(410,50,790,430)

    currentcp = new PotentialCP(inputcp,null)

    /*
    if(currentcp.isFlatFoldable){yes(currentcp)} else{no(currentcp)}
    */
}
function yes(currentcp){
    console.log("yes")
    if(currentcp.CP.assignedFaces.length == currentcp.CP.faces.length){
        alert("The cp has been fully assigned")
        return currentcp
    }
    currentcp = currentcp.createChild()    
    displaycp2.clear()
    displaycp2 = currentcp.CP.displayCp(410,50,790,430)
    return currentcp
}

function no(currentcp){
    console.log("no")
    if(currentcp.index == 0) { //alternatively, if currentcp.parent == null
        alert("No solution can be found")
        return currentcp
    }
    currentcp.dead = true
    currentcp = closestAncestor(currentcp)//go up the tree until you find a node who can have a child
    currentcp = currentcp.createChild()
    displaycp2.clear()
    displaycp2 = currentcp.CP.displayCp(410,50,790,430)
    return currentcp
    
}
function closestAncestor(currentcp){
    if((!currentcp.dead & currentcp.children.length<2) | currentcp.parent == null){
        return currentcp
    } else{
        return closestAncestor(currentcp.parent)
    }
}