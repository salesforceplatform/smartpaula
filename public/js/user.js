$(function () {
    $.get(window.location.href + '/data', function (data) {
        console.log(data);
        JSON.parse(data);
        
    });
});