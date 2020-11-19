var coll = document.getElementsByClassName("collapsible");

for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        console.log(this);
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
        var indicator = this.getElementsByClassName("indicator-icon")[0];
        console.log(indicator);
        indicator.classList.toggle('fa-plus');
        indicator.classList.toggle('fa-minus');
        //.toggleClass('fa-plus fa-minus');
    });
}