Check various combinations of URLs
url("http://172.29.0.156:8080/bs-3.3.7/dt-1.10.18/NestTest-1.10.18/images/sort_both.png")
background-image: url(images/icons/sort_both.png);
background-image: url(../images/icons/sort_both.png);
background-image: url(../../images/icons/sort_both.png);
background-image: url(/images/icons/sort_both.png);

Also check sourceMappingURL to see if both can be manipulated in the same file
/*# sourceMappingURL=bootstrap.css.map */

./Images-4.0.0/image.js
