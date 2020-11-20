var coll = document.getElementsByClassName("collapsible");

for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;

        if (content.style.maxHeight){
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }

        if (content.parentElement.classList[0] === "collapsible-inner")
        {
            var parentElement = content.parentElement;

            var parentHeight = parseInt(parentElement.style.maxHeight.replace('px', ''));
            var ownHeight = parseInt(content.style.maxHeight.replace('px', ''));

            var newHeight;

            if (parentElement.style.maxHeight === null){
                newHeight = parentHeight - ownHeight;

            } else {
                newHeight = parentHeight + ownHeight;
            }
            parentElement.style.maxHeight = newHeight + "px";

        }

        var indicator = this.getElementsByClassName("indicator-icon")[0];
        indicator.classList.toggle('fa-plus');
        indicator.classList.toggle('fa-minus');
    });
}