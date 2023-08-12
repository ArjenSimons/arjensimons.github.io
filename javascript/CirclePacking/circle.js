class Circle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 60;
        this.growing = true;
    }

    show() {
        ellipse(this.x, this.y, this.r*2, this.r*2);
        //point(this.x, this.y);
    }

    grow() {
        if (this.growing)
            this.r += 1;
    }

    edgeIsTouching(){
        return this.x + this.r + 2 > width || this.x - this.r - 2 < 0 || this.y + this.r + 2 > height || this.y - this.r - 2 < 58;
    }
}