class Boid {
    constructor() {
        this.position = createVector(random(0, width), random(0, height));
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(2, 5));
        this.acceleration = createVector();
        this.maxForce = 0.3;
        this.maxSpeed = 5;
        this.perceptionRange = 50;
    }

    update() {
        this.velocity.limit(this.maxSpeed);


        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);

        this.HandleEdges()
    }

    show() {
        strokeWeight(8);
        stroke(255);
        point(this.position.x, this.position.y);
    }

    flock(boids) {
        //Check for boids in range
        let boidsInRange = [];
        for (let other of boids) {
            if (other === this) {
                continue;
            }
            let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
            if (distance < this.perceptionRange) {
                boidsInRange.push(other);
            }
        }
        if (boidsInRange.length < 1) {
            return;
        }

        //Align
        let alignment = this.align(boidsInRange);
        this.acceleration.add(alignment);

    }

    align(boids) {
        let steering = createVector();

        for (let other of boids) {
            steering.add(other.velocity);
        }

        steering.div(boids.length);
        steering.setMag(this.maxSpeed);
        steering.sub(this.velocity);
        steering.limit(this.maxForce);

        return steering;
    }

    HandleEdges() {
        if (this.position.x < 0) {
            this.position.x = width;
        } else if (this.position.x > width) {
            this.position.x = 0;
        }

        if (this.position.y < 0) {
            this.position.y = height;
        } else if (this.position.y > height) {
            this.position.y = 0;
        }
    }
}