$(function () {
    $.get(window.location.href + '/data', function (data) {
        var ctx = $('#questionnare_overall')[0].getContext('2d');        
        pam_chart = new Chart(ctx,
            {
                type: 'line',
                data: data.lists
            })
    });
});