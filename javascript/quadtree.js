class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    contains(point){
        let halfWidth = this.w / 2;
        let halfHeight = this.h / 2;

        return (
            point.x > this.x - halfWidth &&
            point.x < this.x + halfWidth &&
            point.y > this.y - halfHeight &&
            point.y < this.y + halfHeight
        )
    }
}

class QuadTree {
    constructor(boundry) {
        this.boundry = boundry;
        this.capacity = 4;
        this.boids = [];
        this.divided = false;
    }

    insert(boid) {

        if (!this.boundry.contains(boid)){
            console.log("doesn't contain");
            return;
        }

        if (this.boids.length < this.capacity) {
            this.boids.push(boid);
        }
        else {
            if (!this.divided) {
                this.subdivide();
            }
            this.topLeft.insert(boid);
            this.topRight.insert(boid);
            this.bottomLeft.insert(boid);
            this.bottomRight.insert(boid);
        }
    }

    subdivide() {
        let halfWidth = this.boundry.w / 2;
        let halfHeight = this.boundry.h / 2;
        let quarterWidth = halfWidth / 2;
        let quarterHeight = halfHeight / 2;

        this.topLeft = new QuadTree(new Rectangle(this.boundry.x - quarterWidth, this.boundry.y + quarterHeight, halfWidth, halfHeight));
        this.topRight = new QuadTree(new Rectangle(this.boundry.x + quarterWidth, this.boundry.y + quarterHeight, halfWidth, halfHeight));
        this.bottomLeft = new QuadTree(new Rectangle(this.boundry.x - quarterWidth, this.boundry.y - quarterHeight, halfWidth, halfHeight));
        this.bottomRight = new QuadTree(new Rectangle(this.boundry.x + quarterWidth, this.boundry.y - quarterHeight, halfWidth, halfHeight));

        this.divided = true;
    }
}