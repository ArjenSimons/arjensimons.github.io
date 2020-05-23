let boids = [];


function setup() {
    var canvas = createCanvas(windowWidth, windowHeight - 100);
    canvas.parent('homecontent');

    spawnBoids();
}

function draw() {
    background(51);

    ellipse(windowWidth / 2, (windowHeight - 100) / 2, 50, 50);
    resizeCanvas(windowWidth, windowHeight - 100);

    for(let boid of boids){
        boid.show();
        boid.update();
        boid.flock(boids);
    }
}

function windowResized() {
    spawnBoids();
}

function spawnBoids(){
    boids = [];
    for (let i = 0; i < 100; i++){
        boids.push(new Boid());
    }
}