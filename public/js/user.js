$(function () {
    $.get(window.location.href + '/data', function (data) {
        JSON.parse(data);
        console.log(data);
    });
});