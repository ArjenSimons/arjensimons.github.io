let boids = [];
let canvas;
let checked = false;
let qt;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight - 100);
    canvas.parent('homecontent');

    spawnBoids();

    rectMode(CENTER);

}

function draw() {
    background(51);

    resizeCanvas(windowWidth, windowHeight - 100);

    qt = new QuadTree(new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width, canvas.height));

    // for(let i = 0;  i < 239; i ++){
    //     qt.insert(createVector(random(canvas.width), random(canvas.height)));
    // }

    //Add boids to quad tree
    for(let boid of boids) {
        qt.insert(boid);
    }

    //Setting stroke for boids
    let weight = width / 100;
    if (weight > 10) {
        weight = 10
    }
    strokeWeight(weight);
    stroke(255);

    for(let boid of boids){
        boid.show();
        boid.update();
        //boid.flock(boids);
        let boidsInRange = qt.queryRange(boid.getRange())
        boid.flock(boidsInRange);
        //if (boidsInRange.length > 10) console.log(boidsInRange.length);
        //if (!checked) console.log(boidsInRange.length);
    }
    checked = true;

    //qt.show();

    textSize(32);

    text(frameRate(), width / 2, height / 2);
}

function windowResized() {
    spawnBoids();
}

function spawnBoids(){
    boids = [];
    for (let i = 0; i < 500; i++){
        boids.push(new Boid());
    }
}