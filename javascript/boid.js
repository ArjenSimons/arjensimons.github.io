class Boid {
    constructor() {
        let halfWidth = width / 2;
        let quarterWidth = width / 10;
        let halfHeight = height / 2;
        let quarterHeight = height / 10;
        this.position = createVector(
            random(halfWidth - quarterWidth, halfWidth + quarterWidth),
            random(halfHeight - quarterHeight, halfHeight + quarterHeight)
        );
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(2, 15));
        this.acceleration = createVector();
        this.maxForce = 1;
        this.maxSpeed = 15;
        this.alignmentRange = 70;
        this.cohesionRange = 90;
        this.seperationRange = 40;
        this.mouseRange = 70;
        this.alignmentWeight = 1.4;
        this.cohesionWeight = 1.3;
        this.separationWeight = 1.6 * 1.6;
        this.mouseAvoidanceWeight = 10;
        this.edgeAvoidanceWeight = 10;
    }

    getRange(){
        let range = this.alignmentRange;

        if (this.seperationRange > range)
            range = this.seperationRange;

        if (this.cohesionRange > range)
            range = this.cohesionRange;

        return new Rectangle(this.position.x, this.position.y, range, range);
    }

    update() {
        this.velocity.limit(this.maxSpeed);
        this.position.add(p5.Vector.mult(this.velocity, deltaTime / 50));
        this.velocity.add(this.acceleration);
        this.acceleration.set(0, 0);


        this.maxSpeed = 15 * (width / 500);
        if (this.maxSpeed > 24) {
            this.maxSpeed = 24;
        }
    }

    show() {


        // triangle(
        //     this.position.x - xOffset, this.position.y - weight,
        //     this.position.x + xOffset, this.position.y - weight,
        //     this.position.x, this.position.y + weight);
        // translate (width/2, height/2);
        // rotate(90);
        // translate(-width/2, -height/2);



        point(this.position.x, this.position.y);
    }

    flock(boids) {
        //Check for boids in range
        let alignmentBoids = [];
        let cohesionBoids = [];
        let separationBoids = [];

        for (let other of boids) {
            if (other === this) {
                continue;
            }
            let dot = this.velocity.dot(p5.Vector.sub(this.position, other.position));
            if (dot > -200) {
               let distance = this.distSquared(this.position.x, this.position.y, other.position.x, other.position.y);
                //let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
                if (distance < this.alignmentRange * this.alignmentRange) {
                    alignmentBoids.push(other);
                }
                if (distance < this.cohesionRange) {
                    cohesionBoids.push(other);
                }
                if (distance < this.seperationRange) {
                    separationBoids.push(other);
                }
            }
        }

        let edgeAvoidance = this.HandleEdges();
        edgeAvoidance.mult(this.edgeAvoidanceWeight);
        this.acceleration.add(edgeAvoidance);

        //MouseAvoidance
        let mouseAvoidance = this.mouseAvoidance();
        mouseAvoidance.mult(this.mouseAvoidanceWeight);
        this.acceleration.add(mouseAvoidance);

        if (mouseAvoidance > 0) {
            return;
        }

        //Alignment
        if (alignmentBoids.length > 0) {
            let alignment = this.alignment(alignmentBoids);
            alignment.mult(this.alignmentWeight);
            this.acceleration.add(alignment);
        }

        //Cohesion
        if (cohesionBoids.length > 0) {
            let cohesion = this.cohesion(cohesionBoids);
            cohesion.mult(this.cohesionWeight);
            this.acceleration.add(cohesion);
        }

        //Separation
        if (separationBoids.length > 0) {
            let separation = this.separation(separationBoids);
            separation.mult(this.separationWeight);
            this.acceleration.add(separation);
        }
    }

    alignment(boids) {
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

    cohesion(boids) {
        let steering = createVector();

        for (let other of boids) {
            steering.add(other.position);
        }

        steering.div(boids.length);
        steering.sub(this.position);
        steering.setMag(this.maxSpeed);
        steering.sub(this.velocity);
        steering.limit(this.maxForce);

        return steering;
    }

    separation(boids) {
        let steering = createVector();

        for (let other of boids) {
            let distance = this.distSquared(this.position.x, this.position.y, other.position.x, other.position.y);
            //let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
            let diff = p5.Vector.sub(this.position, other.position);
            if (distance > 0) {
                diff.div(distance); //Closer boids will have stronger impact on this void
            }

            steering.add(diff);
        }

        steering.div(boids.length);
        steering.setMag(this.maxSpeed);
        steering.sub(this.velocity);
        steering.limit(this.maxForce);

        return steering;
    }

    mouseAvoidance() {
        let steering = createVector();
        let mouse = createVector(mouseX, mouseY)
        let distance = this.distSquared(this.position.x, this.position.y, mouse.x, mouse.y);
        //let distance = dist(this.position.x, this.position.y, mouse.x, mouse.y);

        if (distance < this.mouseRange * this.mouseRange) {
            let diff = p5.Vector.sub(this.position, mouse);

            steering.add(diff);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }

        return steering;
    }

    HandleEdges() {
        let steeringForce = createVector(0, 0);

        // if (this.position.x < 20){
        //     steeringForce.x = 1;
        // }
        // else if (this.position.x > width - 20){
        //     steeringForce.x = -1;
        // }
        //
        // if (this.position.y < 20){
        //     steeringForce.y = 1;
        // }
        // else if (this.position.y > height - 20){
        //     steeringForce.y = -1;
        // }
        //
        // if (steeringForce.x !== 0 && steeringForce.y !== 0) {
        //     steeringForce.setMag(this.maxSpeed);
        //     steeringForce.sub(this.velocity);
        //     steeringForce.limit(this.maxForce);
        // }

        if (this.position.x < 0) {
            this.position.x = width;
        } else if (this.position.x > width) {
            this.position.x = 0;
        }
        if (this.position.y < 60) {
            this.position.y = height;
        } else if (this.position.y > height) {
            this.position.y = 60;
        }

        return steeringForce;
    }

    distSquared(x1, y1, x2, y2){
        return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    }
}